"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { buildPomodoroPlan, type PomodoroPlan } from "@/lib/pomodoroPlan";
import { playChime, notifyPhaseChange } from "@/lib/pomodoroFeedback";

export type TimerMode = "simple" | "pomodoro";
export type TimerPhase = "focus" | "short_break" | "long_break";

export const PHASE_LABEL: Record<TimerPhase, string> = {
  focus: "Focus",
  short_break: "Pause courte",
  long_break: "Pause longue",
};

interface PomoState {
  phase: TimerPhase;
  phaseSecondsLeft: number;
  cycleCount: number;
  /** Time actually spent focused — counts up in "simple" mode, and only during focus
   *  phases in "pomodoro" mode. This is what becomes the session's `actualMinutes`. */
  focusSeconds: number;
}

function phaseDurationSeconds(phase: TimerPhase, plan: PomodoroPlan): number {
  if (phase === "focus") return plan.focusMinutes * 60;
  if (phase === "long_break") return plan.longBreakMinutes * 60;
  return plan.shortBreakMinutes * 60;
}

const noBreak = (plan: PomodoroPlan) => plan.shortBreakMinutes === 0 && plan.longBreakMinutes === 0;

function nextPomoState(p: PomoState, mode: TimerMode, plan: PomodoroPlan): PomoState {
  if (mode === "simple") return { ...p, focusSeconds: p.focusSeconds + 1 };
  // A single-block plan (session too short to split) has no break: count down to 0 and hold
  // there — still tracking focusSeconds underneath so "Terminer" captures the real elapsed time.
  if (p.phase === "focus" && noBreak(plan)) {
    return { ...p, phaseSecondsLeft: Math.max(0, p.phaseSecondsLeft - 1), focusSeconds: p.focusSeconds + 1 };
  }
  if (p.phaseSecondsLeft > 1) {
    return { ...p, phaseSecondsLeft: p.phaseSecondsLeft - 1, focusSeconds: p.phase === "focus" ? p.focusSeconds + 1 : p.focusSeconds };
  }
  if (p.phase === "focus") {
    const cycleCount = p.cycleCount + 1;
    const phase: TimerPhase = cycleCount % plan.cyclesBeforeLongBreak === 0 ? "long_break" : "short_break";
    return { phase, phaseSecondsLeft: phaseDurationSeconds(phase, plan), cycleCount, focusSeconds: p.focusSeconds + 1 };
  }
  return { phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: p.cycleCount, focusSeconds: p.focusSeconds };
}

function initialPomoState(plan: PomodoroPlan): PomoState {
  return { phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: 0, focusSeconds: 0 };
}

/**
 * The single, app-wide timer engine — mounted once in AppShell (outside the routed page
 * content) so navigating between pages never tears it down. Whichever page previously owned
 * the ticking state would lose it on every route change, since Next.js unmounts the old page's
 * component tree; living here instead means the countdown survives navigation, and any page
 * can render a view of the same live state via this hook.
 */
export function useSessionTimerEngine() {
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const studySessions = useAppStore((s) => s.studySessions);
  const subjects = useAppStore((s) => s.subjects);
  const completeSession = useAppStore((s) => s.completeSession);
  const setSessionStatus = useAppStore((s) => s.setSessionStatus);
  const preferredMode = useAppStore((s) => s.preferredTimerMode);
  const setPreferredMode = useAppStore((s) => s.setPreferredTimerMode);

  const session = useMemo(() => studySessions.find((s) => s.id === activeSessionId) ?? null, [studySessions, activeSessionId]);
  const subject = useMemo(() => subjects.find((s) => s.id === session?.subjectId) ?? null, [subjects, session]);
  const plan = useMemo(() => buildPomodoroPlan(session?.durationMinutes ?? 25), [session?.durationMinutes]);

  // The caller (GlobalSessionTimer) keys its host component by activeSessionId, so this hook
  // is only ever mounted fresh for a given session — these initializers run once per session,
  // no reset-on-change effect needed.
  const [mode, setMode] = useState<TimerMode>(preferredMode);
  const [running, setRunning] = useState(true);
  const [pomo, setPomo] = useState<PomoState>(() => initialPomoState(plan));

  useEffect(() => {
    if (!running || !session) return;
    const id = setInterval(() => setPomo((p) => nextPomoState(p, mode, plan)), 1000);
    return () => clearInterval(id);
  }, [running, session, mode, plan]);

  // Fires the chime/notification exactly once per real phase change.
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

  function switchMode(next: TimerMode) {
    setMode(next);
    setPreferredMode(next);
    if (next === "pomodoro") {
      setPomo((p) => ({ phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: 0, focusSeconds: p.focusSeconds }));
    }
  }

  function toggleRunning() {
    setRunning((r) => !r);
  }

  function skipPhase() {
    setPomo((p) => {
      if (p.phase === "focus") {
        const cycleCount = p.cycleCount + 1;
        const phase: TimerPhase = cycleCount % plan.cyclesBeforeLongBreak === 0 ? "long_break" : "short_break";
        return { phase, phaseSecondsLeft: phaseDurationSeconds(phase, plan), cycleCount, focusSeconds: p.focusSeconds };
      }
      return { phase: "focus", phaseSecondsLeft: phaseDurationSeconds("focus", plan), cycleCount: p.cycleCount, focusSeconds: p.focusSeconds };
    });
  }

  function finish() {
    if (!session) return;
    completeSession(session.id, Math.max(1, Math.round(pomo.focusSeconds / 60)));
  }

  function abandon() {
    if (!session) return;
    setSessionStatus(session.id, "a_faire");
  }

  return { session, subject, mode, running, pomo, plan, switchMode, toggleRunning, skipPhase, finish, abandon };
}

export type SessionTimerEngine = ReturnType<typeof useSessionTimerEngine>;
