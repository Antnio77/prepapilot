"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, SkipForward, Square, Target, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressBar";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { playChime, notifyPhaseChange } from "@/lib/pomodoroFeedback";
import { buildPomodoroPlan, type PomodoroPlan } from "@/lib/pomodoroPlan";
import { cn } from "@/lib/utils";
import type { StudySession } from "@/types";

type Mode = "simple" | "pomodoro";
type Phase = "focus" | "short_break" | "long_break";

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  short_break: "Pause courte",
  long_break: "Pause longue",
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface PomoState {
  phase: Phase;
  phaseSecondsLeft: number;
  cycleCount: number;
  /** Time actually spent focused — counts up in "simple" mode, and only during focus
   *  phases in "pomodoro" mode. This is what becomes the session's `actualMinutes`. */
  focusSeconds: number;
}

function phaseDurationSeconds(phase: Phase, plan: PomodoroPlan): number {
  if (phase === "focus") return plan.focusMinutes * 60;
  if (phase === "long_break") return plan.longBreakMinutes * 60;
  return plan.shortBreakMinutes * 60;
}

const NO_BREAK = (plan: PomodoroPlan) => plan.shortBreakMinutes === 0 && plan.longBreakMinutes === 0;

function nextPomoState(p: PomoState, mode: Mode, plan: PomodoroPlan): PomoState {
  if (mode === "simple") return { ...p, focusSeconds: p.focusSeconds + 1 };
  // A single-block plan (session too short to split) has no break: count down to 0 and hold
  // there — still tracking focusSeconds underneath so "Terminer" captures the real elapsed time.
  if (p.phase === "focus" && NO_BREAK(plan)) {
    return { ...p, phaseSecondsLeft: Math.max(0, p.phaseSecondsLeft - 1), focusSeconds: p.focusSeconds + 1 };
  }
  if (p.phaseSecondsLeft > 1) {
    return { ...p, phaseSecondsLeft: p.phaseSecondsLeft - 1, focusSeconds: p.phase === "focus" ? p.focusSeconds + 1 : p.focusSeconds };
  }
  if (p.phase === "focus") {
    const cycleCount = p.cycleCount + 1;
    const phase: Phase = cycleCount % plan.cyclesBeforeLongBreak === 0 ? "long_break" : "short_break";
    return { phase, phaseSecondsLeft: phaseDurationSeconds(phase, plan), cycleCount, focusSeconds: p.focusSeconds + 1 };
  }
  return { phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: p.cycleCount, focusSeconds: p.focusSeconds };
}

export function SessionTimer({ session, onClose }: { session: StudySession | null; onClose: () => void }) {
  const subjects = useAppStore((s) => s.subjects);
  const startSession = useAppStore((s) => s.startSession);
  const completeSession = useAppStore((s) => s.completeSession);
  const setSessionStatus = useAppStore((s) => s.setSessionStatus);
  const preferredMode = useAppStore((s) => s.preferredTimerMode);
  const setPreferredMode = useAppStore((s) => s.setPreferredTimerMode);

  // The parent keys this component by session id, so a fresh instance (and fresh
  // initial state below) is mounted whenever a different session is started.
  const plan = buildPomodoroPlan(session?.durationMinutes ?? 25);
  const [mode, setMode] = useState<Mode>(preferredMode);
  const [running, setRunning] = useState(true);
  const [pomo, setPomo] = useState<PomoState>(() => ({ phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: 0, focusSeconds: 0 }));

  useEffect(() => {
    if (session) startSession(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running || !session) return;
    const id = setInterval(() => setPomo((p) => nextPomoState(p, mode, plan)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, session, mode]);

  // Fires the chime/notification exactly once per real phase change — kept in an effect
  // (not inside the reducer above) so it can never run twice from React's dev double-invoke.
  const prevPhaseRef = useRef(pomo.phase);
  useEffect(() => {
    if (pomo.phase === prevPhaseRef.current) return;
    prevPhaseRef.current = pomo.phase;
    if (mode !== "pomodoro") return;
    playChime();
    notifyPhaseChange(
      pomo.phase === "focus" ? "Focus — c'est reparti" : "Pause méritée",
      pomo.phase === "focus"
        ? "Retour à la révision."
        : `${PHASE_LABEL[pomo.phase]} de ${pomo.phase === "long_break" ? plan.longBreakMinutes : plan.shortBreakMinutes} min.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomo.phase, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setPreferredMode(next);
    if (next === "pomodoro") {
      setPomo((p) => ({ phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: 0, focusSeconds: p.focusSeconds }));
    }
  }

  function skipPhase() {
    setPomo((p) => {
      if (p.phase === "focus") {
        const cycleCount = p.cycleCount + 1;
        const phase: Phase = cycleCount % plan.cyclesBeforeLongBreak === 0 ? "long_break" : "short_break";
        return { phase, phaseSecondsLeft: phaseDurationSeconds(phase, plan), cycleCount, focusSeconds: p.focusSeconds };
      }
      return { phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: p.cycleCount, focusSeconds: p.focusSeconds };
    });
  }

  if (!session) return null;

  const subject = subjects.find((s) => s.id === session.subjectId);
  const color = subject ? subjectColorVar(subject.colorKey) : "var(--accent)";
  const isBreak = mode === "pomodoro" && pomo.phase !== "focus";
  const ringColor = isBreak ? "var(--success)" : color;
  const filledDots =
    pomo.phase === "focus"
      ? pomo.cycleCount % plan.cyclesBeforeLongBreak
      : pomo.cycleCount % plan.cyclesBeforeLongBreak === 0
        ? plan.cyclesBeforeLongBreak
        : pomo.cycleCount % plan.cyclesBeforeLongBreak;
  const pct =
    mode === "simple"
      ? Math.min(100, (pomo.focusSeconds / (session.durationMinutes * 60)) * 100)
      : ((phaseDurationSeconds(pomo.phase, plan) - pomo.phaseSecondsLeft) / phaseDurationSeconds(pomo.phase, plan)) * 100;

  function finish() {
    if (!session) return;
    completeSession(session.id, Math.max(1, Math.round(pomo.focusSeconds / 60)));
    onClose();
  }

  function abandon() {
    if (!session) return;
    setSessionStatus(session.id, "a_faire");
    onClose();
  }

  return (
    <Modal open={Boolean(session)} onClose={abandon} className="text-center">
      <button
        onClick={abandon}
        className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-hover cursor-pointer"
        aria-label="Fermer"
      >
        <X size={18} />
      </button>

      <div className="flex justify-center gap-1 mt-2 mb-1 bg-surface-hover rounded-lg p-1 w-fit mx-auto">
        <button
          onClick={() => switchMode("simple")}
          className={cn(
            "h-7 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
            mode === "simple" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"
          )}
        >
          Chrono libre
        </button>
        <button
          onClick={() => switchMode("pomodoro")}
          className={cn(
            "h-7 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer",
            mode === "pomodoro" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"
          )}
        >
          Pomodoro
        </button>
      </div>

      <p className="text-xs font-semibold tracking-wide uppercase mt-3" style={{ color }}>
        {subject?.name ?? "Session"}
      </p>
      <h2 className="text-lg font-semibold mt-1 px-6">{session.title}</h2>

      {mode === "pomodoro" && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge isBreak={isBreak} />
          {plan.cyclesBeforeLongBreak > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: plan.cyclesBeforeLongBreak }, (_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < filledDots ? "var(--accent)" : "var(--border)" }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center my-6">
        <ProgressRing
          value={pct}
          size={200}
          strokeWidth={8}
          color={ringColor}
          label={
            <div className="flex flex-col items-center">
              <span className="text-4xl font-semibold tabular-nums tracking-tight">
                {mode === "simple" ? formatClock(pomo.focusSeconds) : formatClock(pomo.phaseSecondsLeft)}
              </span>
              <span className="text-xs text-muted mt-1">
                {mode === "simple" ? `objectif ${session.durationMinutes} min` : `${Math.round(pomo.focusSeconds / 60)} min de focus`}
              </span>
            </div>
          }
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" size="lg" onClick={() => setRunning((r) => !r)} className="w-32">
          {running ? (
            <>
              <Pause size={16} /> Pause
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" /> Reprendre
            </>
          )}
        </Button>
        {mode === "pomodoro" ? (
          <Button variant="secondary" size="lg" onClick={skipPhase} className="w-32">
            <SkipForward size={15} /> Passer
          </Button>
        ) : (
          <Button size="lg" onClick={finish} className="w-40">
            <Square size={14} fill="currentColor" /> Terminer
          </Button>
        )}
      </div>
      {mode === "pomodoro" && (
        <Button size="lg" onClick={finish} className="w-full mt-3">
          <Square size={14} fill="currentColor" /> Terminer la session
        </Button>
      )}
      <button onClick={abandon} className="text-xs text-muted-foreground mt-5 hover:text-foreground transition-colors cursor-pointer">
        Abandonner la session
      </button>
    </Modal>
  );
}

function Badge({ isBreak }: { isBreak: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: isBreak ? "var(--success-soft)" : "var(--accent-soft)", color: isBreak ? "var(--success)" : "var(--accent)" }}
    >
      {isBreak ? <Coffee size={12} /> : <Target size={12} />}
      {isBreak ? "Pause" : "Concentration"}
    </span>
  );
}
