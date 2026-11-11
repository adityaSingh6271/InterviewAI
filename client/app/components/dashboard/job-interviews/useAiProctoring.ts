"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ProctoringTelemetry {
  faceDetected: boolean;
  faceCentered: boolean;
  faceConfidence: number; // 0-100
  facePresenceScore: number; // Cumulative % of video frames with face detected (0-100)
  faceBox: { x: number; y: number; width: number; height: number } | null;
  gazeDirection: "center" | "left" | "right" | "down";
  eyeContactScore: number; // 0-100
  isLookingAway: boolean;
  postureStatus: "optimal" | "shifting" | "fidgeting";
  postureScore: number; // 0-100
  motionEnergy: number; // 0-100
  isSpeaking: boolean;
  audioLevel: number; // 0-100
  waveformBins: number[]; // Array of 16 normalized bars (0-100)
  speechCadenceWpm: number;
  fillerWordsCount: number;
  detectedFillerWords: string[];
  overallIntegrityScore: number; // 0-100
}

export type CameraStatus = "initializing" | "active" | "paused" | "denied" | "unavailable";

interface UseAiProctoringOptions {
  onTranscriptUpdate?: (transcriptText: string) => void;
  autoSpeakQuestions?: boolean;
}

interface SpeechResultAlternativeLike {
  transcript: string;
}

interface SpeechResultLike {
  isFinal: boolean;
  0?: SpeechResultAlternativeLike;
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}

interface SpeechErrorEventLike {
  error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type BrowserMediaWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  webkitAudioContext?: typeof AudioContext;
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "sort of",
  "kind of",
];

const EMPTY_WAVEFORM = Array.from({ length: 16 }, () => 8);

const INITIAL_TELEMETRY: ProctoringTelemetry = {
  faceDetected: false,
  faceCentered: false,
  faceConfidence: 0,
  facePresenceScore: 0,
  faceBox: null,
  gazeDirection: "center",
  eyeContactScore: 0,
  isLookingAway: false,
  postureStatus: "optimal",
  postureScore: 100,
  motionEnergy: 0,
  isSpeaking: false,
  audioLevel: 0,
  waveformBins: EMPTY_WAVEFORM,
  speechCadenceWpm: 0,
  fillerWordsCount: 0,
  detectedFillerWords: [],
  overallIntegrityScore: 0,
};

function countFillerWords(words: string[]): string[] {
  const found: string[] = [];
  const joined = words.join(" ");
  for (const filler of FILLER_WORDS) {
    if (filler.includes(" ")) {
      if (joined.includes(filler)) found.push(filler);
    } else {
      for (const w of words) {
        if (w.replace(/[^a-z]/g, "") === filler) found.push(filler);
      }
    }
  }
  return found;
}

function getSpeechConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as BrowserMediaWindow;
  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return preferred.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useAiProctoring({
  onTranscriptUpdate,
  autoSpeakQuestions = true,
}: UseAiProctoringOptions = {}) {
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("initializing");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(autoSpeakQuestions);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(() => Boolean(getSpeechConstructor()));
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previousFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const mountedRef = useRef(true);

  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const wantListeningRef = useRef(false);
  const isMicActiveRef = useRef(isMicActive);
  const isCameraActiveRef = useRef(isCameraActive);
  const hasCameraRef = useRef(hasCamera);

  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
    isMicActiveRef.current = isMicActive;
    isCameraActiveRef.current = isCameraActive;
    hasCameraRef.current = hasCamera;
  }, [onTranscriptUpdate, isMicActive, isCameraActive, hasCamera]);

  const baseTranscriptRef = useRef("");
  const finalSegmentsRef = useRef("");

  const totalFramesRef = useRef(0);
  const faceDetectedFramesRef = useRef(0);
  const lookingCenterFramesRef = useRef(0);
  const telemetryFrozenRef = useRef(false);
  const lookAwayStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const ttsEndCallbackRef = useRef<(() => void) | null>(null);
  const ttsResumeTimerRef = useRef<number | null>(null);

  const [telemetry, setTelemetry] = useState<ProctoringTelemetry>(INITIAL_TELEMETRY);

  const updateTelemetryFromTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const elapsedMinutes = Math.max(
      0.08,
      speechStartRef.current ? (Date.now() - speechStartRef.current) / 60000 : 0.25,
    );
    const computedWpm = Math.min(220, Math.max(60, Math.round(words.length / elapsedMinutes)));
    const foundFillers = countFillerWords(words);

    setTelemetry((prev) => ({
      ...prev,
      speechCadenceWpm: computedWpm,
      fillerWordsCount: foundFillers.length,
      detectedFillerWords: Array.from(new Set(foundFillers)),
    }));
  }, []);

  const attachStreamToVideo = useCallback((el: HTMLVideoElement | null) => {
    const stream = streamRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = true;
    el.playsInline = true;
    el.autoplay = true;
    el.play().catch(() => {});
  }, []);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElRef.current = node;
      if (node) {
        attachStreamToVideo(node);
      }
    },
    [attachStreamToVideo],
  );

  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    if (stream.getAudioTracks().length === 0) return;
    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      const win = window as BrowserMediaWindow;
      const AudioContextClass = window.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch (err) {
      console.warn("Web Audio analyser setup skipped:", err);
    }
  }, []);

  const acquireMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      setHasMic(false);
      setCameraStatus("unavailable");
      setCameraError("Browser does not support camera/microphone capture.");
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;
    let lastErrorName = "";

    const attempts: MediaStreamConstraints[] = [
      { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: true },
      { video: true, audio: true },
      { video: true, audio: false },
      { video: false, audio: true },
    ];

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastErrorName = (err as { name?: string } | null)?.name ?? "";
      }
    }

    if (!mountedRef.current) {
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }

    if (!stream) {
      setHasCamera(false);
      setHasMic(false);
      setIsCameraActive(false);
      const denied =
        lastErrorName === "NotAllowedError" || lastErrorName === "PermissionDeniedError";
      setCameraStatus(denied ? "denied" : "unavailable");
      setCameraError(
        denied
          ? "Camera permission blocked. Allow camera access in your browser bar and click Retry."
          : "No working camera device found. Check your webcam connection.",
      );
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    streamRef.current = stream;

    const camReady = videoTracks.length > 0;
    const micReady = audioTracks.length > 0;

    setHasCamera(camReady);
    setHasMic(micReady);
    setIsCameraActive(camReady);
    setIsMicActive(micReady);
    setCameraStatus(camReady ? "active" : "unavailable");
    setCameraError(
      camReady ? null : "Microphone connected, but no video feed was detected.",
    );

    if (videoElRef.current) {
      attachStreamToVideo(videoElRef.current);
    }
    setupAudioAnalyser(stream);
  }, [attachStreamToVideo, setupAudioAnalyser]);

  const retryMedia = useCallback(async () => {
    setCameraStatus("initializing");
    setCameraError(null);
    await acquireMedia();
  }, [acquireMedia]);

  // 1. Initialize camera + mic on mount
  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      void acquireMedia();
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(timer);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [acquireMedia]);

  // 2. Setup browser SpeechRecognition (optional live interim stream; MediaRecorder Whisper handles Brave/offline)
  useEffect(() => {
    const SpeechRecognition = getSpeechConstructor();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      if (mountedRef.current) {
        setIsListening(true);
      }
    };

    recognition.onresult = (event: SpeechResultEventLike) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const piece = item?.[0]?.transcript ?? "";
        if (item?.isFinal) {
          finalSegmentsRef.current = `${finalSegmentsRef.current} ${piece}`.trim();
        } else {
          interimTranscript += piece;
        }
      }

      const spokenBody = [finalSegmentsRef.current, interimTranscript.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      const combined = [baseTranscriptRef.current.trim(), spokenBody]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (combined && onTranscriptUpdateRef.current) {
        setSpeechNotice(null);
        onTranscriptUpdateRef.current(combined);
      }

      if (spokenBody) {
        updateTelemetryFromTranscript(spokenBody);
        setTelemetry((prev) => ({ ...prev, isSpeaking: true }));
      }
    };

    recognition.onerror = (e: SpeechErrorEventLike) => {
      if (!mountedRef.current) return;
      if (e.error === "network" || e.error === "service-not-allowed") {
        // Browsers like Brave block Chromium's Google speech endpoint; fall back cleanly to Whisper audio recorder
        setSpeechSupported(false);
        setSpeechNotice(
          "Recording your voice directly — AI transcription will populate when you pause or complete.",
        );
      } else if (e.error === "not-allowed") {
        wantListeningRef.current = false;
        setIsListening(false);
        setSpeechNotice("Microphone permission blocked — check browser mic permissions or type below.");
      }
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      setIsListening(false);
      if (wantListeningRef.current && isMicActiveRef.current && speechSupported) {
        try {
          recognition.start();
        } catch {}
      }
    };

    speechRecognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.abort();
      } catch {}
      speechRecognitionRef.current = null;
    };
  }, [speechSupported, updateTelemetryFromTranscript]);

  const clearRecordedAudio = useCallback(() => {
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
    setHasRecordedAudio(false);
  }, []);

  // Turn-based voice capture: starts both SpeechRecognition (when available) AND MediaRecorder backup
  const startListeningTurn = useCallback((existingText = "") => {
    baseTranscriptRef.current = existingText.trim();
    finalSegmentsRef.current = "";
    speechStartRef.current = Date.now();
    wantListeningRef.current = true;
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
    setHasRecordedAudio(false);

    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack && !audioTrack.enabled) {
        audioTrack.enabled = true;
        setIsMicActive(true);
      }

      // Start universal MediaRecorder on the mic track so Brave / Safari / offline browsers always capture audio
      if (audioTrack && typeof MediaRecorder !== "undefined") {
        try {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
          const audioOnlyStream = new MediaStream([audioTrack]);
          const mimeType = pickAudioMimeType();
          const recorder = mimeType
            ? new MediaRecorder(audioOnlyStream, { mimeType })
            : new MediaRecorder(audioOnlyStream);

          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              recordedChunksRef.current.push(ev.data);
              if (mountedRef.current) setHasRecordedAudio(true);
            }
          };

          mediaRecorderRef.current = recorder;
          recorder.start(500);
          setIsListening(true);
        } catch (err) {
          console.warn("Audio MediaRecorder start skipped:", err);
        }
      }
    }

    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }

    const recognition = speechRecognitionRef.current;
    if (recognition && speechSupported) {
      try {
        recognition.start();
      } catch {}
    } else {
      setSpeechNotice(
        "Recording your voice directly — AI transcription will populate when you pause or complete.",
      );
    }
  }, [speechSupported]);

  const stopListeningTurn = useCallback(async (): Promise<Blob | null> => {
    wantListeningRef.current = false;
    setIsListening(false);
    setTelemetry((prev) => ({ ...prev, isSpeaking: false }));

    const recognition = speechRecognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {}
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      const blob = await new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          const chunks = recordedChunksRef.current;
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          const built = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          recordedBlobRef.current = built;
          if (mountedRef.current) setHasRecordedAudio(built.size > 0);
          resolve(built.size > 0 ? built : null);
        };
        try {
          if (typeof recorder.requestData === "function") {
            recorder.requestData();
          }
          recorder.stop();
        } catch {
          resolve(recordedBlobRef.current);
        }
      });
      return blob;
    }

    return recordedBlobRef.current;
  }, []);

  // 3. Vision & Audio Analysis Loop
  useEffect(() => {
    let active = true;
    let lastTick = 0;

    const analyzeFrame = (now: number) => {
      if (!active) return;
      if (telemetryFrozenRef.current) {
        return;
      }
      if (now - lastTick < 66) {
        animFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }
      lastTick = now;

      let currentAudioLevel = 0;
      let newWaveform = EMPTY_WAVEFORM;

      if (analyserRef.current && isMicActiveRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        const bins: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 16));
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          sum += val;
          bins.push(Math.round((val / 255) * 100));
        }
        currentAudioLevel = Math.round((sum / (16 * 255)) * 100);
        newWaveform = bins;
      }

      const video = videoElRef.current;
      const canvas = canvasRef.current;
      const cameraEnabled = isCameraActiveRef.current && hasCameraRef.current;

      // When the video view unmounts (e.g. evaluating/result modal view), preserve session telemetry
      if (!video || !canvas) {
        animFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const canProcessVideo =
        cameraEnabled &&
        video.readyState >= 2 &&
        video.videoWidth > 0;

      if (!canProcessVideo) {
        setTelemetry((prev) => ({
          ...prev,
          faceDetected: cameraEnabled ? prev.faceDetected : false,
          faceCentered: cameraEnabled ? prev.faceCentered : false,
          faceConfidence: cameraEnabled ? prev.faceConfidence : 0,
          faceBox: cameraEnabled ? prev.faceBox : null,
          isLookingAway: false,
          motionEnergy: 0,
          audioLevel: currentAudioLevel,
          waveformBins: newWaveform,
          isSpeaking: currentAudioLevel > 12 || wantListeningRef.current,
        }));
        animFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      totalFramesRef.current += 1;

      let motionDelta = 0;
      let detectedFace = false;
      let centeredFace = false;
      let faceConfidence = 0;
      let currentGaze: "center" | "left" | "right" | "down" = "center";
      let computedBox: { x: number; y: number; width: number; height: number } | null = null;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const w = 160;
        const h = 120;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        try {
          const frame = ctx.getImageData(0, 0, w, h);
          const data = frame.data;

          if (previousFrameDataRef.current) {
            const prev = previousFrameDataRef.current;
            let diff = 0;
            let samples = 0;
            for (let i = 0; i < data.length; i += 32) {
              const rDiff = Math.abs(data[i]! - prev[i]!);
              const gDiff = Math.abs(data[i + 1]! - prev[i + 1]!);
              const bDiff = Math.abs(data[i + 2]! - prev[i + 2]!);
              diff += (rDiff + gDiff + bDiff) / 3;
              samples++;
            }
            motionDelta = Math.min(100, Math.round((diff / (Math.max(1, samples) * 255)) * 380));
          }

          previousFrameDataRef.current = new Uint8ClampedArray(data);

          let sumX = 0;
          let sumY = 0;
          let count = 0;
          let minX = w;
          let maxX = 0;
          let minY = h;
          let maxY = 0;

          // YCbCr chromatic skin/face mask holds steady across varied indoor/cool lighting
          for (let y = 10; y < h - 10; y += 3) {
            for (let x = 10; x < w - 10; x += 3) {
              const idx = (y * w + x) * 4;
              const r = data[idx]!;
              const g = data[idx + 1]!;
              const b = data[idx + 2]!;

              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
              const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

              if (luma > 35 && cb >= 72 && cb <= 136 && cr >= 127 && cr <= 182) {
                sumX += x;
                sumY += y;
                count++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (count >= 25) {
            detectedFace = true;
            faceConfidence = Math.min(98, Math.max(74, Math.round(72 + Math.min(count, 260) / 10)));
            const avgX = sumX / count;
            const avgY = sumY / count;
            const mirroredNormX = 1 - avgX / w;
            const normY = avgY / h;

            if (mirroredNormX < 0.28) {
              currentGaze = "left";
            } else if (mirroredNormX > 0.72) {
              currentGaze = "right";
            } else if (normY > 0.76) {
              currentGaze = "down";
            } else {
              currentGaze = "center";
              centeredFace = true;
            }

            const rawWidth = Math.max(28, Math.min(58, ((maxX - minX) / w) * 100));
            const rawHeight = Math.max(36, Math.min(72, ((maxY - minY) / h) * 100));
            const boxX = Math.max(8, Math.min(92 - rawWidth, (1 - maxX / w) * 100));
            const boxY = Math.max(8, Math.min(92 - rawHeight, (minY / h) * 100));
            computedBox = {
              x: Math.round(boxX),
              y: Math.round(boxY),
              width: Math.round(rawWidth),
              height: Math.round(rawHeight),
            };
          }
        } catch {}
      }

      if (detectedFace) {
        faceDetectedFramesRef.current += 1;
      }

      if (detectedFace && currentGaze === "center") {
        lookingCenterFramesRef.current += 1;
        lookAwayStartRef.current = null;
      } else if (!lookAwayStartRef.current) {
        lookAwayStartRef.current = Date.now();
      }

      const isAwayExtended =
        lookAwayStartRef.current !== null && Date.now() - lookAwayStartRef.current > 3500;

      const facePresencePct = Math.min(
        100,
        Math.round((faceDetectedFramesRef.current / Math.max(1, totalFramesRef.current)) * 100),
      );

      const eyeContactPct = Math.min(
        100,
        Math.max(
          0,
          Math.round((lookingCenterFramesRef.current / Math.max(1, totalFramesRef.current)) * 100),
        ),
      );

      const postureStatus: "optimal" | "shifting" | "fidgeting" =
        motionDelta > 45 ? "fidgeting" : motionDelta > 25 ? "shifting" : "optimal";
      const postureScore = Math.max(45, 100 - motionDelta);
      const overallIntegrity = Math.round(
        eyeContactPct * 0.5 + postureScore * 0.3 + (detectedFace ? 20 : 0),
      );

      setTelemetry((prev) => ({
        ...prev,
        faceDetected: detectedFace,
        faceCentered: centeredFace,
        faceConfidence,
        facePresenceScore: facePresencePct,
        faceBox: computedBox,
        gazeDirection: currentGaze,
        eyeContactScore: eyeContactPct,
        isLookingAway: isAwayExtended,
        postureStatus,
        postureScore,
        motionEnergy: motionDelta,
        audioLevel: currentAudioLevel,
        waveformBins: newWaveform,
        isSpeaking: currentAudioLevel > 12 || wantListeningRef.current,
        overallIntegrityScore: overallIntegrity,
      }));

      animFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    animFrameRef.current = requestAnimationFrame(analyzeFrame);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const clearTtsTimer = useCallback(() => {
    if (ttsResumeTimerRef.current !== null) {
      window.clearInterval(ttsResumeTimerRef.current);
      ttsResumeTimerRef.current = null;
    }
  }, []);

  // 4. Text-to-Speech (TTS) with guaranteed completion callback
  const speakQuestion = useCallback(
    (text: string, onComplete?: () => void) => {
      clearTtsTimer();
      ttsEndCallbackRef.current = onComplete ?? null;

      if (!isTtsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsAiSpeaking(false);
        const cb = ttsEndCallbackRef.current;
        ttsEndCallbackRef.current = null;
        cb?.();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*_#`]/g, "").trim();
        if (!cleanText) {
          setIsAiSpeaking(false);
          const cb = ttsEndCallbackRef.current;
          ttsEndCallbackRef.current = null;
          cb?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Daniel") ||
              v.name.includes("David")),
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTtsTimer();
          if (mountedRef.current) setIsAiSpeaking(false);
          const cb = ttsEndCallbackRef.current;
          ttsEndCallbackRef.current = null;
          cb?.();
        };

        utterance.onstart = () => {
          if (mountedRef.current) setIsAiSpeaking(true);
        };
        utterance.onend = finish;
        utterance.onerror = finish;

        setIsAiSpeaking(true);
        window.speechSynthesis.speak(utterance);

        ttsResumeTimerRef.current = window.setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          } else if (!window.speechSynthesis.speaking) {
            finish();
          }
        }, 400);
      } catch (e) {
        console.warn("SpeechSynthesis error:", e);
        clearTtsTimer();
        setIsAiSpeaking(false);
        const cb = ttsEndCallbackRef.current;
        ttsEndCallbackRef.current = null;
        cb?.();
      }
    },
    [clearTtsTimer, isTtsEnabled],
  );

  const stopSpeaking = useCallback(
    (triggerComplete = false) => {
      clearTtsTimer();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsAiSpeaking(false);
      const cb = ttsEndCallbackRef.current;
      ttsEndCallbackRef.current = null;
      if (triggerComplete) cb?.();
    },
    [clearTtsTimer],
  );

  const toggleCamera = useCallback(() => {
    const stream = streamRef.current;
    const videoTrack = stream?.getVideoTracks()[0];
    if (!videoTrack) {
      void retryMedia();
      return;
    }
    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraActive(videoTrack.enabled);
    setCameraStatus(videoTrack.enabled ? "active" : "paused");
    if (videoTrack.enabled && videoElRef.current) {
      attachStreamToVideo(videoElRef.current);
    }
  }, [attachStreamToVideo, retryMedia]);

  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    const audioTrack = stream?.getAudioTracks()[0];
    if (!audioTrack) {
      void retryMedia();
      return;
    }
    audioTrack.enabled = !audioTrack.enabled;
    setIsMicActive(audioTrack.enabled);
    if (!audioTrack.enabled) {
      void stopListeningTurn();
    }
  }, [retryMedia, stopListeningTurn]);

  const toggleTts = useCallback(() => {
    setIsTtsEnabled((prev) => {
      const next = !prev;
      if (!next) stopSpeaking(true);
      return next;
    });
  }, [stopSpeaking]);

  const freezeTelemetry = useCallback(() => {
    telemetryFrozenRef.current = true;
  }, []);

  return {
    videoRef,
    canvasRef,
    hasCamera,
    hasMic,
    cameraStatus,
    cameraError,
    isCameraActive,
    isMicActive,
    isListening,
    speechSupported,
    speechNotice,
    hasRecordedAudio,
    getRecordedAudio: () => recordedBlobRef.current,
    clearRecordedAudio,
    updateTelemetryFromTranscript,
    freezeTelemetry,
    isAiSpeaking,
    isTtsEnabled,
    telemetry,
    retryMedia,
    toggleCamera,
    toggleMic,
    toggleTts,
    speakQuestion,
    stopSpeaking,
    startListeningTurn,
    stopListeningTurn,
  };
}
