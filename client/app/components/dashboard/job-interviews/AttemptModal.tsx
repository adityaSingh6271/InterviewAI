"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { InterviewRound, JobInterview } from "@/lib/types/jobInterview";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Bot,
  User,
  AlertCircle,
  ShieldCheck,
  Mic,
  Square,
  Volume2,
  Play,
  SkipForward,
  Pause,
} from "lucide-react";
import IconButton from "@/components/common/icon-button";
import { attemptsApi, type ServerResponse } from "@/lib/api/attempts";
import {
  interviewsApi,
  type ServerQuestion,
} from "@/lib/api/interviews";
import { getErrorMessage } from "@/lib/api/errors";
import toast from "react-hot-toast";
import { useAiProctoring } from "./useAiProctoring";
import AiProctoringView from "./AiProctoringView";

interface AttemptModalProps {
  interview: JobInterview;
  round: InterviewRound;
  onClose: () => void;
  /** Called after a successful submit so the workspace can refresh attempts. */
  onSubmitted?: () => void;
}

type ChatMessage = {
  sender: "ai" | "user";
  text: string;
  time: string;
};

type Phase = "loading" | "active" | "evaluating" | "result";

/** Explicit conversational turn-taking state for smooth voice UX. */
type TurnStage =
  | "ai_speaking"
  | "ready_to_speak"
  | "user_speaking"
  | "reviewing"
  | "round_complete";

const NOT_ANSWERED_LABEL = "Not answered";

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function AttemptModal({
  interview,
  round,
  onClose,
  onSubmitted,
}: AttemptModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [turnStage, setTurnStage] = useState<TurnStage>("ai_speaking");
  const [questions, setQuestions] = useState<ServerQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    responses: ServerResponse[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleTranscriptUpdate = useCallback((spokenText: string) => {
    setInputText(spokenText);
  }, []);

  const {
    videoRef,
    canvasRef,
    hasCamera,
    cameraStatus,
    cameraError,
    isCameraActive,
    isMicActive,
    isListening,
    speechSupported,
    speechNotice,
    hasRecordedAudio,
    getRecordedAudio,
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
  } = useAiProctoring({
    onTranscriptUpdate: handleTranscriptUpdate,
    autoSpeakQuestions: true,
  });

  // Simulation timer (pauses on result screen)
  useEffect(() => {
    if (phase === "result") return;
    const timer = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Turn speaking duration timer
  useEffect(() => {
    if (turnStage !== "user_speaking") return;
    const timer = setInterval(() => setSpeakingSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [turnStage]);

  // Scroll to bottom on new messages or turn updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, turnStage]);

  const speakCurrentPrompt = useCallback(
    (promptText: string, nextStageAfterSpeech: TurnStage = "ready_to_speak") => {
      void stopListeningTurn();
      setTurnStage("ai_speaking");
      speakQuestion(promptText, () => {
        setTurnStage(nextStageAfterSpeech);
      });
    },
    [speakQuestion, stopListeningTurn],
  );

  // Boot: ensure the round has questions and start the attempt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await interviewsApi.ensureQuestions(round.id);
        if (cancelled) return;
        const roundQuestions: ServerQuestion[] = data.questions;
        if (!roundQuestions || roundQuestions.length === 0) {
          throw new Error("No interview questions are available for this round yet.");
        }

        const { data: attempt } = await attemptsApi.start(round.id);
        if (cancelled) return;
        setQuestions(roundQuestions);
        setAttemptId(attempt.id);

        const initialPrompt = roundQuestions[0].prompt;
        setMessages([
          {
            sender: "ai",
            text: `Welcome to "${round.title}". Listen to each question, click "Start Speaking" when you're ready for your turn, and click "I've Completed My Answer" when finished.\n\n${initialPrompt}`,
            time: formatTimer(0),
          },
        ]);
        setPhase("active");

        setTimeout(() => {
          if (!cancelled) {
            speakCurrentPrompt(initialPrompt, "ready_to_speak");
          }
        }, 450);
      } catch (err) {
        console.error("Failed to start simulation:", err);
        if (!cancelled) {
          toast.error(
            getErrorMessage(
              err,
              "Couldn't start the simulation - please try again.",
            ),
          );
          onClose();
        }
      }
    })();
    return () => {
      cancelled = true;
      stopSpeaking(false);
      stopListeningTurn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  const transcribeClipIfNeeded = useCallback(
    async (existingText: string, clip: Blob | null): Promise<string> => {
      const trimmed = existingText.trim();
      if (trimmed) return trimmed;
      if (!clip || clip.size === 0 || !attemptId) return "";

      setIsTranscribing(true);
      try {
        const { data } = await attemptsApi.transcribeAudio(attemptId, clip);
        const transcribed = data.transcript.trim();
        if (transcribed) {
          setInputText(transcribed);
          updateTelemetryFromTranscript(transcribed);
          clearRecordedAudio();
          return transcribed;
        }
        return "";
      } catch (err) {
        toast.error(
          getErrorMessage(
            err,
            "Could not transcribe audio automatically - please type your answer.",
          ),
        );
        return "";
      } finally {
        setIsTranscribing(false);
      }
    },
    [attemptId, clearRecordedAudio, updateTelemetryFromTranscript],
  );

  const handleStartSpeaking = useCallback(() => {
    if (phase !== "active" || isSavingAnswer || isTranscribing) return;
    stopSpeaking(false);
    setSpeakingSeconds(0);
    setTurnStage("user_speaking");
    startListeningTurn(inputText);
  }, [inputText, isSavingAnswer, isTranscribing, phase, startListeningTurn, stopSpeaking]);

  const handlePauseSpeaking = useCallback(async () => {
    const clip = await stopListeningTurn();
    setTurnStage("reviewing");
    if (!inputText.trim() && clip) {
      await transcribeClipIfNeeded(inputText, clip);
    }
  }, [inputText, stopListeningTurn, transcribeClipIfNeeded]);

  const handleSkipAiVoice = useCallback(() => {
    stopSpeaking(true);
    setTurnStage("ready_to_speak");
  }, [stopSpeaking]);

  const submitCurrentAnswer = useCallback(
    async (options?: {
      explicitTranscript?: string;
      allowEmptyAsNotAnswered?: boolean;
    }) => {
      const question = questions[questionIndex];
      if (!attemptId || !question || phase !== "active" || isSavingAnswer || isTranscribing) {
        return;
      }

      stopSpeaking(false);
      const stoppedClip = await stopListeningTurn();
      const rawTranscript =
        options?.explicitTranscript?.trim() ||
        (await transcribeClipIfNeeded(inputText, stoppedClip ?? getRecordedAudio()));

      const transcript =
        rawTranscript ||
        (options?.allowEmptyAsNotAnswered ? NOT_ANSWERED_LABEL : "");

      if (!transcript) {
        toast.error("Please speak into your microphone or type your answer before completing.");
        return;
      }

      if (
        !rawTranscript &&
        options?.allowEmptyAsNotAnswered &&
        options?.explicitTranscript === undefined
      ) {
        toast("No speech detected — recorded as Not answered.");
      }

      setIsSavingAnswer(true);
      setInputText("");
      clearRecordedAudio();
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: transcript, time: formatTimer(secondsElapsed) },
      ]);

      try {
        await attemptsApi.createResponse(attemptId, {
          questionId: question.id,
          transcript,
        });
      } catch (err) {
        console.error("Failed to save answer:", err);
        toast.error(
          getErrorMessage(
            err,
            "Couldn't save your answer - it is kept in this session.",
          ),
        );
      } finally {
        setIsSavingAnswer(false);
      }

      const nextIdx = questionIndex + 1;
      if (nextIdx < questions.length) {
        setQuestionIndex(nextIdx);
        const nextPrompt = questions[nextIdx].prompt;
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `Thank you. Moving on to Question ${nextIdx + 1} of ${questions.length}:\n\n${nextPrompt}`,
            time: formatTimer(secondsElapsed + 1),
          },
        ]);
        setTimeout(() => {
          speakCurrentPrompt(nextPrompt, "ready_to_speak");
        }, 400);
      } else {
        const closingMsg =
          "Excellent work! You have completed every question in this round. Click \"Finish & Score Round\" whenever you are ready for your AI evaluation.";
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: closingMsg,
            time: formatTimer(secondsElapsed + 1),
          },
        ]);
        speakCurrentPrompt(closingMsg, "round_complete");
      }
    },
    [
      attemptId,
      clearRecordedAudio,
      getRecordedAudio,
      inputText,
      isSavingAnswer,
      isTranscribing,
      phase,
      questionIndex,
      questions,
      secondsElapsed,
      speakCurrentPrompt,
      stopListeningTurn,
      stopSpeaking,
      transcribeClipIfNeeded,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (!attemptId || isSavingAnswer || isTranscribing || phase === "evaluating") return;
    stopSpeaking(false);
    await stopListeningTurn();
    freezeTelemetry();
    setPhase("evaluating");
    try {
      await attemptsApi.submit(attemptId);
      const { data: responses } = await attemptsApi.listResponses(attemptId, {
        limit: 100,
      });
      const scored = responses.filter((r) => r.aiScore != null);
      const score =
        scored.length > 0
          ? Math.round(
              scored.reduce((sum, r) => sum + (r.aiScore ?? 0), 0) /
                scored.length,
            )
          : null;
      setResult({ score, responses });
      setPhase("result");
      onSubmitted?.();
    } catch (err) {
      console.error("Failed to submit attempt:", err);
      toast.error(
        getErrorMessage(
          err,
          "Couldn't submit the attempt - your answers are saved.",
        ),
      );
      setPhase("active");
    }
  }, [attemptId, freezeTelemetry, isSavingAnswer, isTranscribing, onSubmitted, phase, stopListeningTurn, stopSpeaking]);

  const handleClose = useCallback(() => {
    if (phase === "evaluating") return;
    stopSpeaking(false);
    void stopListeningTurn();
    onClose();
  }, [phase, onClose, stopListeningTurn, stopSpeaking]);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const isTurnBusy = isSavingAnswer || isTranscribing;
  const canCompleteTurn = Boolean(inputText.trim() || hasRecordedAudio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl xl:max-w-6xl bg-white dark:bg-[#1E1E2D] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] h-full sm:h-[88vh]">
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 shrink-0">
                  AI Interview Simulation
                </span>
                <span className="text-slate-600 hidden sm:inline">&bull;</span>
                <span className="text-xs text-slate-300 font-semibold truncate hidden sm:inline">
                  Round {round.order}: {round.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {interview.targetRole}{" "}
                {interview.company && `@ ${interview.company}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>
                {hasCamera && isCameraActive ? "Biometric HUD Active" : "Session Connected"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono font-semibold">
              <Clock className="size-3.5" />
              {formatTimer(secondsElapsed)}
            </div>

            <IconButton
              type="button"
              action="close"
              showLabel={false}
              size="icon-sm"
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white"
            />
          </div>
        </div>

        {/* Loading Phase */}
        {phase === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3.5 p-12 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-12 h-12 rounded-2xl bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center">
              <Sparkles className="size-6 animate-pulse text-[#0C356A]" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Calibrating AI Examiner &amp; Biometrics...
            </h4>
            <p className="text-xs text-slate-500 max-w-xs text-center">
              Preparing questions and connecting camera &amp; audio telemetry for{" "}
              {round.title}.
            </p>
          </div>
        )}

        {/* Active Phase: Split-View Workspace */}
        {phase !== "loading" && phase !== "result" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
            {/* Left Column: Camera, Eye, Face & Movement Proctoring HUD */}
            <div className="lg:col-span-5 p-3 sm:p-4 bg-slate-950 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden shrink-0">
              <AiProctoringView
                videoRef={videoRef}
                canvasRef={canvasRef}
                telemetry={telemetry}
                hasCamera={hasCamera}
                cameraStatus={cameraStatus}
                cameraError={cameraError}
                isCameraActive={isCameraActive}
                isMicActive={isMicActive}
                isListening={isListening}
                isAiSpeaking={isAiSpeaking}
                isTtsEnabled={isTtsEnabled}
                onToggleCamera={toggleCamera}
                onRetryMedia={retryMedia}
                onToggleMic={toggleMic}
                onToggleTts={toggleTts}
                onSkipSpeaking={handleSkipAiVoice}
                onRepeatQuestion={() => {
                  const currentPrompt = questions[questionIndex]?.prompt;
                  if (currentPrompt && turnStage !== "round_complete") {
                    speakCurrentPrompt(currentPrompt, "ready_to_speak");
                  }
                }}
                candidateName={interview.targetRole}
              />
            </div>

            {/* Right Column: AI Conversation Stream & Smooth Turn Controls */}
            <div className="lg:col-span-7 flex flex-col bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden min-h-0">
              {/* Dialogue Transcript Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.map((msg, idx) => {
                  const isAi = msg.sender === "ai";
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 ${
                        isAi ? "justify-start" : "justify-end"
                      }`}
                    >
                      {isAi && (
                        <div className="w-8 h-8 rounded-xl bg-[#0C356A] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <Bot className="size-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-xl p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isAi
                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs"
                            : "bg-[#0C356A] text-white font-medium ml-auto"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span
                          className={`text-[10px] block mt-1.5 ${
                            isAi ? "text-slate-400" : "text-blue-200"
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                      {!isAi && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <User className="size-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {phase === "evaluating" && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                    <Sparkles className="size-4 text-[#0C356A]" />
                    AI Examiner is scoring answers against competency rubrics...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Conversational Turn Control Dock & Transcript Composer */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#1E1E2D] border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                {/* Interactive Turn Banner */}
                {phase === "active" && turnStage === "ai_speaking" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-3.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#0C356A] text-white flex items-center justify-center shrink-0">
                        <Volume2 className="size-4 animate-pulse" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0C356A] dark:text-blue-300">
                          AI Interviewer is speaking Question {questionIndex + 1} of{" "}
                          {questions.length}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Listen carefully — your turn controls unlock automatically when finished.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSkipAiVoice}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-[#0C356A] dark:text-blue-300 hover:bg-blue-100/70 transition-colors cursor-pointer shrink-0"
                    >
                      <SkipForward className="size-3.5" />
                      Skip &amp; Answer Now
                    </button>
                  </div>
                )}

                {phase === "active" && turnStage === "ready_to_speak" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Mic className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          Your Turn to Speak
                        </p>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                          AI finished the question. Click below when you&apos;re ready to start speaking, or type your response.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartSpeaking}
                      disabled={isSavingAnswer}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <Play className="size-3.5 fill-current" />
                      Start Speaking Answer
                    </button>
                  </div>
                )}

                {phase === "active" && turnStage === "user_speaking" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white shrink-0">
                        <Mic className="size-4" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-300" />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                            {speechSupported ? "Listening to Your Answer" : "Voice Recording Active"}
                          </p>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200">
                            {formatTimer(speakingSeconds)} &middot; {wordCount} words
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                          {speechNotice ||
                            "Speak naturally — click when you finish explaining your answer."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handlePauseSpeaking()}
                        disabled={isTurnBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Pause className="size-3.5" />
                        Pause &amp; Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void submitCurrentAnswer({ allowEmptyAsNotAnswered: true })
                        }
                        disabled={isTurnBusy || !canCompleteTurn}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0C356A] hover:bg-blue-900 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        {isTranscribing
                          ? "Transcribing..."
                          : isSavingAnswer
                            ? "Saving..."
                            : "I've Completed My Answer"}
                      </button>
                    </div>
                  </div>
                )}

                {phase === "active" && turnStage === "reviewing" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <Square className="size-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium">
                        {isTranscribing
                          ? "Transcribing your spoken answer with AI..."
                          : canCompleteTurn
                            ? "Review or refine your transcript, then click Completed & Next."
                            : "No answer text captured yet — Resume Speaking, type below, or click Skip Question."}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartSpeaking}
                        disabled={isTurnBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <Mic className="size-3.5" />
                        Resume Speaking
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void submitCurrentAnswer({ allowEmptyAsNotAnswered: true })
                        }
                        disabled={isTurnBusy || !canCompleteTurn}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0C356A] hover:bg-blue-900 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        {isTranscribing
                          ? "Transcribing..."
                          : isSavingAnswer
                            ? "Saving..."
                            : "Completed & Next"}
                      </button>
                    </div>
                  </div>
                )}

                {phase === "active" && turnStage === "round_complete" && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          All Round Questions Completed
                        </p>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                          Submit your session now for rubric scoring &amp; detailed AI feedback.
                        </p>
                      </div>
                    </div>
                    <IconButton
                      type="button"
                      action="submit"
                      label="Finish & Score Round"
                      onClick={handleSubmit}
                      isLoading={false}
                      disabled={isSavingAnswer}
                      size="sm"
                    />
                  </div>
                )}

                {/* Answer Transcript Textarea (hidden only when all questions are completed) */}
                {turnStage !== "round_complete" && (
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        if (turnStage === "ready_to_speak" && e.target.value.trim().length > 0) {
                          setTurnStage("reviewing");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (canCompleteTurn) {
                            void submitCurrentAnswer({ allowEmptyAsNotAnswered: true });
                          }
                        }
                      }}
                      placeholder={
                        turnStage === "ai_speaking"
                          ? "Listening to AI question... (or click Skip & Answer Now)"
                          : turnStage === "user_speaking"
                            ? "Your live spoken response appears here as you speak..."
                            : "Type your answer here or click Start Speaking Answer above..."
                      }
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] resize-none"
                    />

                    <IconButton
                      type="button"
                      onClick={() =>
                        void submitCurrentAnswer({ allowEmptyAsNotAnswered: true })
                      }
                      isLoading={isTurnBusy}
                      disabled={!canCompleteTurn || phase !== "active" || isTurnBusy}
                      icon={<Send className="size-4" />}
                      label={isTranscribing ? "Transcribing..." : "Complete"}
                      variant="default"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Question {Math.min(questionIndex + 1, questions.length)} of{" "}
                    {questions.length}
                  </span>

                  {turnStage !== "round_complete" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void submitCurrentAnswer({
                            explicitTranscript: NOT_ANSWERED_LABEL,
                            allowEmptyAsNotAnswered: true,
                          })
                        }
                        disabled={
                          phase !== "active" || isTurnBusy || questions.length === 0
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <SkipForward className="size-3.5" />
                        Skip Question
                      </button>

                      <IconButton
                        type="button"
                        action="submit"
                        label="Finish & Score Round"
                        onClick={handleSubmit}
                        isLoading={phase === "evaluating"}
                        disabled={
                          phase === "evaluating" || isTurnBusy || questions.length === 0
                        }
                        loadingText="Evaluating..."
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Screen with AI & Biometric Proctoring Scorecard */}
        {phase === "result" && result && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Round Simulation Successfully Evaluated!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your responses have been processed through AI rubric scoring
                  and biometric vision telemetry.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="text-4xl font-extrabold text-[#0C356A] dark:text-blue-400">
                  {result.score != null ? `${result.score}%` : "—"}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {result.score != null ? "AI Evaluated" : "Submitted"}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {result.score != null ? "Overall Technical Depth" : "Awaiting AI Evaluation"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-medium text-slate-500 uppercase">
                  Eye Contact Focus
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {hasCamera && isCameraActive ? `${telemetry.eyeContactScore}%` : "—"}
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {!hasCamera || !isCameraActive
                    ? "Camera Inactive"
                    : telemetry.eyeContactScore >= 75
                      ? "High Attention"
                      : telemetry.eyeContactScore >= 45
                        ? "Moderate Focus"
                        : "Low Focus"}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-medium text-slate-500 uppercase">
                  Posture Stability
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {hasCamera && isCameraActive ? `${telemetry.postureScore}%` : "—"}
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {hasCamera && isCameraActive ? telemetry.postureStatus : "Camera Inactive"}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-medium text-slate-500 uppercase">
                  Speech Cadence
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {telemetry.speechCadenceWpm > 0 ? `${telemetry.speechCadenceWpm} WPM` : "—"}
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {telemetry.speechCadenceWpm === 0
                    ? "No Speech Logged"
                    : telemetry.speechCadenceWpm >= 100 && telemetry.speechCadenceWpm <= 165
                      ? "Optimal Tempo"
                      : telemetry.speechCadenceWpm < 100
                        ? "Measured Pace"
                        : "Fast Pace"}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-medium text-slate-500 uppercase">
                  Proctor Integrity
                </div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    !hasCamera || !isCameraActive
                      ? "text-slate-600 dark:text-slate-300"
                      : telemetry.facePresenceScore >= 35 || telemetry.faceDetected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {!hasCamera || !isCameraActive
                    ? "Unproctored"
                    : telemetry.facePresenceScore >= 35 || telemetry.faceDetected
                      ? "Verified"
                      : "Flagged"}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {!hasCamera || !isCameraActive
                    ? "Camera was disabled"
                    : telemetry.facePresenceScore >= 35 || telemetry.faceDetected
                      ? `Face presence confirmed (${telemetry.facePresenceScore}%)`
                      : "Face presence low during session"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question Performance &amp; Diagnostic Feedback
              </h4>

              {result.responses.map((response, idx) => (
                <div
                  key={response.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Topic Question {idx + 1}
                    </span>
                    {response.aiScore != null && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Score: {response.aiScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Your response:{" "}
                    </span>
                    &ldquo;{response.transcript?.trim() || NOT_ANSWERED_LABEL}&rdquo;
                  </p>
                  {response.aiFeedback && (
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <AlertCircle className="size-4 shrink-0 text-[#0C356A] dark:text-blue-400 mt-0.5" />
                      <p className="leading-relaxed">{response.aiFeedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer for Result screen */}
        {phase === "result" && (
          <div className="p-4 bg-white dark:bg-[#1E1E2D] border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
            <IconButton
              type="button"
              action="close"
              label="Return to Workspace"
              onClick={handleClose}
              variant="default"
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
