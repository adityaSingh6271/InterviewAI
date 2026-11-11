"use client";

import React from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldCheck,
  Eye,
  User,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { CameraStatus, ProctoringTelemetry } from "./useAiProctoring";

interface AiProctoringViewProps {
  videoRef: React.Ref<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  telemetry: ProctoringTelemetry;
  hasCamera: boolean;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  isCameraActive: boolean;
  isMicActive: boolean;
  isListening: boolean;
  isAiSpeaking: boolean;
  isTtsEnabled: boolean;
  onToggleCamera: () => void;
  onRetryMedia: () => void;
  onToggleMic: () => void;
  onToggleTts: () => void;
  onRepeatQuestion?: () => void;
  onSkipSpeaking?: () => void;
  candidateName?: string;
}

export default function AiProctoringView({
  videoRef,
  canvasRef,
  telemetry,
  hasCamera,
  cameraStatus,
  cameraError,
  isCameraActive,
  isMicActive,
  isListening,
  isAiSpeaking,
  isTtsEnabled,
  onToggleCamera,
  onRetryMedia,
  onToggleMic,
  onToggleTts,
  onRepeatQuestion,
  onSkipSpeaking,
  candidateName = "Candidate",
}: AiProctoringViewProps) {
  const {
    faceDetected,
    faceCentered,
    faceConfidence,
    faceBox,
    gazeDirection,
    eyeContactScore,
    isLookingAway,
    postureStatus,
    postureScore,
    waveformBins,
    speechCadenceWpm,
    fillerWordsCount,
    overallIntegrityScore,
  } = telemetry;

  const showLiveVideo = hasCamera && isCameraActive;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-white shadow-xl">
      {/* Top Proctoring Integrity Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-200 tracking-tight">
            AI Vision &amp; Biometric Proctor
          </span>
          {showLiveVideo && (
            <>
              <span className="text-slate-600">&middot;</span>
              <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                {overallIntegrityScore}% Integrity
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {showLiveVideo ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10.5px] font-mono text-emerald-400 uppercase tracking-wider">
                Live Stream
              </span>
            </>
          ) : (
            <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
              {cameraStatus === "initializing" ? "Connecting..." : "Camera Standby"}
            </span>
          )}
        </div>
      </div>

      {/* Main Video Stream Container with Live HUD Overlays */}
      <div className="relative flex-1 min-h-[220px] sm:min-h-[260px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Hidden Optical Processing Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed (kept mounted so callback ref attaches as soon as stream arrives) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
            showLiveVideo ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          }`}
        />

        {/* Camera Initializing / Off / Denied Placeholder */}
        {!showLiveVideo && (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              {cameraStatus === "initializing" ? (
                <RefreshCw className="size-7 animate-spin text-cyan-400" />
              ) : (
                <User className="size-8" />
              )}
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-slate-200">{candidateName}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {cameraStatus === "initializing"
                  ? "Connecting camera & microphone stream..."
                  : cameraError ||
                    (cameraStatus === "paused"
                      ? "Camera feed paused"
                      : "Enable your camera to preview your face & eye tracking")}
              </p>
            </div>
            {cameraStatus !== "initializing" && (
              <button
                type="button"
                onClick={hasCamera ? onToggleCamera : onRetryMedia}
                className="text-xs px-3.5 py-2 bg-[#0C356A] hover:bg-blue-600 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="size-3.5" />
                {hasCamera ? "Resume Camera" : "Allow / Retry Camera"}
              </button>
            )}
          </div>
        )}

        {/* HUD Target Overlay: Bounding Box & Crosshairs */}
        {showLiveVideo && faceDetected && faceBox && (
          <div
            className={`absolute pointer-events-none transition-all duration-150 rounded-xl border-2 ${
              faceCentered
                ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)]"
                : "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]"
            }`}
            style={{
              left: `${faceBox.x}%`,
              top: `${faceBox.y}%`,
              width: `${faceBox.width}%`,
              height: `${faceBox.height}%`,
            }}
          >
            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm" />
            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm" />
            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm" />

            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <span className="w-3 h-0.5 bg-white" />
              <span className="w-0.5 h-3 bg-white absolute" />
            </div>

            <div className="absolute -top-6 left-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-emerald-400 border border-emerald-500/40">
              FACE: {faceConfidence}% CONF
            </div>
          </div>
        )}

        {/* HUD Overlay Pills (Top Left) */}
        {showLiveVideo && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border ${
                faceDetected && faceCentered
                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60"
                  : faceDetected
                    ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                    : "bg-rose-950/70 text-rose-300 border-rose-700/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  faceDetected && faceCentered
                    ? "bg-emerald-400"
                    : faceDetected
                      ? "bg-amber-400"
                      : "bg-rose-400"
                }`}
              />
              <span>
                {faceDetected && faceCentered
                  ? "Face Centered"
                  : faceDetected
                    ? "Face Off-center"
                    : "Face Not Detected"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md bg-slate-900/75 border border-slate-700/60 text-slate-300">
              <Eye className="size-3 text-cyan-400 shrink-0" />
              <span>
                Gaze:{" "}
                <strong className="text-white font-semibold capitalize">
                  {gazeDirection === "center" ? "Direct Eye Contact" : `Look ${gazeDirection}`}
                </strong>{" "}
                ({eyeContactScore}%)
              </span>
            </div>
          </div>
        )}

        {/* Active Mic Recording Indicator (Top Right) */}
        {isListening && isMicActive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-600/90 text-white shadow-lg backdrop-blur-md pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>REC</span>
          </div>
        )}

        {/* Looking Away Alert Banner */}
        {showLiveVideo && isLookingAway && (
          <div className="absolute top-20 left-3 right-3 p-2 rounded-xl bg-amber-500/90 text-slate-950 text-xs font-semibold backdrop-blur-md flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <AlertTriangle className="size-4 shrink-0 text-slate-950" />
            <span>Please maintain direct eye contact with the camera during your response.</span>
          </div>
        )}

        {/* AI Speaking Indicator Banner */}
        {isAiSpeaking && (
          <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-[#0C356A]/95 border border-blue-400/40 text-white text-xs font-medium backdrop-blur-md flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="size-4 text-cyan-300 animate-pulse shrink-0" />
              <span className="truncate">AI Interviewer is speaking the question...</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1">
                {[40, 80, 50, 100, 60].map((h, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${h * 0.14}px` }}
                    className="w-1 bg-cyan-300 rounded-full animate-pulse"
                  />
                ))}
              </div>
              {onSkipSpeaking && (
                <button
                  type="button"
                  onClick={onSkipSpeaking}
                  className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white cursor-pointer transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Voice Waveform & Telemetry Strip */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Activity className="size-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-mono">Speech Telemetry</span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-1 h-5 max-w-xs mx-auto">
            {waveformBins.map((val, idx) => (
              <div
                key={idx}
                style={{
                  height: `${Math.max(4, (val / 100) * 20)}px`,
                }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  val > 50
                    ? "bg-linear-to-t from-cyan-500 to-emerald-400"
                    : val > 20
                      ? "bg-linear-to-t from-blue-600 to-cyan-400"
                      : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="text-[11px] font-mono text-cyan-400">
            {speechCadenceWpm > 0 ? `${speechCadenceWpm} WPM` : "0 WPM"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5">
            <div className="text-slate-400 truncate">Posture Stability</div>
            <div className="font-semibold text-emerald-400 mt-0.5 capitalize">
              {showLiveVideo ? `${postureStatus} (${postureScore}%)` : "Camera Off"}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5">
            <div className="text-slate-400 truncate">Eye Contact</div>
            <div className="font-semibold text-cyan-400 mt-0.5">
              {showLiveVideo ? `${eyeContactScore}% Focus` : "Camera Off"}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5">
            <div className="text-slate-400 truncate">Filler Words</div>
            <div
              className={`font-semibold mt-0.5 ${
                fillerWordsCount > 2 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {fillerWordsCount} Detected
            </div>
          </div>
        </div>
      </div>

      {/* Media & Audio Action Controls */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCamera}
            title={showLiveVideo ? "Turn camera off" : "Turn camera on"}
            className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showLiveVideo
                ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                : "bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-800"
            }`}
          >
            {showLiveVideo ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
            <span className="hidden sm:inline">{showLiveVideo ? "Camera On" : "Enable Cam"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMic}
            title={isMicActive ? "Mute microphone" : "Unmute microphone"}
            className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
              isMicActive
                ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                : "bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-800"
            }`}
          >
            {isMicActive ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            <span className="hidden sm:inline">{isMicActive ? "Mic On" : "Muted"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTts}
            title={isTtsEnabled ? "Mute AI speech" : "Enable AI voice reading"}
            className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
              isTtsEnabled
                ? "bg-[#0C356A]/70 hover:bg-[#0C356A] text-blue-200 border-blue-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
            }`}
          >
            {isTtsEnabled ? (
              <Volume2 className="size-4 text-cyan-300" />
            ) : (
              <VolumeX className="size-4" />
            )}
            <span className="hidden sm:inline">AI Voice</span>
          </button>

          {onRepeatQuestion && (
            <button
              type="button"
              onClick={onRepeatQuestion}
              title="Repeat current interview question aloud"
              className="p-2 rounded-xl text-xs font-medium border bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="size-4" />
              <span className="hidden sm:inline">Repeat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
