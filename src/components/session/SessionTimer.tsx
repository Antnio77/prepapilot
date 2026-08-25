"use client";

import { Coffee, Minimize2, Pause, Play, SkipForward, Square, Target, TimerReset } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressBar";
import { subjectColorVar } from "@/lib/subjects";
import type { SessionTimerEngine } from "@/lib/session/useSessionTimerEngine";
import { cn } from "@/lib/utils";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * The expanded timer view. Purely presentational — all state lives in useSessionTimerEngine,
 * mounted once at the app shell level, so closing/collapsing this modal (to go look at the
 * Planning page, say) never stops the countdown underneath. Only "Terminer" or "Abandonner"
 * actually end the session.
 */
export function SessionTimer({ engine, onCollapse }: { engine: SessionTimerEngine; onCollapse: () => void }) {
  const { session, subject, mode, running, pomo, plan, targetMinutes, canRecalibrate, switchMode, toggleRunning, skipPhase, finish, abandon, recalibrate } =
    engine;
  if (!session) return null;

  const color = subject ? subjectColorVar(subject.colorKey) : "var(--accent)";
  const isBreak = mode === "pomodoro" && pomo.phase !== "focus";
  const ringColor = isBreak ? "var(--success)" : color;
  const filledDots =
    pomo.phase === "focus"
      ? pomo.cycleCount % plan.cyclesBeforeLongBreak
      : pomo.cycleCount % plan.cyclesBeforeLongBreak === 0
        ? plan.cyclesBeforeLongBreak
        : pomo.cycleCount % plan.cyclesBeforeLongBreak;

  function phaseDurationSeconds(phase: typeof pomo.phase): number {
    if (phase === "focus") return plan.focusMinutes * 60;
    if (phase === "long_break") return plan.longBreakMinutes * 60;
    return plan.shortBreakMinutes * 60;
  }

  const pct =
    mode === "simple"
      ? Math.min(100, (pomo.focusSeconds / (targetMinutes * 60)) * 100)
      : ((phaseDurationSeconds(pomo.phase) - pomo.phaseSecondsLeft) / phaseDurationSeconds(pomo.phase)) * 100;

  function handleFinish() {
    finish();
  }

  function handleAbandon() {
    abandon();
  }

  return (
    <Modal open={Boolean(session)} onClose={onCollapse} className="text-center">
      <button
        onClick={onCollapse}
        className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-hover cursor-pointer"
        aria-label="Réduire (le minuteur continue en arrière-plan)"
        title="Réduire — le minuteur continue"
      >
        <Minimize2 size={16} />
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

      {canRecalibrate && (
        <button
          onClick={recalibrate}
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          title={`Recale ce qu'il reste pour finir à l'heure prévue (${session.endTime})`}
        >
          <TimerReset size={13} />
          Recaler sur {session.endTime}
        </button>
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
                {mode === "simple" ? `objectif ${targetMinutes} min` : `${Math.round(pomo.focusSeconds / 60)} min de focus`}
              </span>
            </div>
          }
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" size="lg" onClick={toggleRunning} className="w-32">
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
          <Button size="lg" onClick={handleFinish} className="w-40">
            <Square size={14} fill="currentColor" /> Terminer
          </Button>
        )}
      </div>
      {mode === "pomodoro" && (
        <Button size="lg" onClick={handleFinish} className="w-full mt-3">
          <Square size={14} fill="currentColor" /> Terminer la session
        </Button>
      )}
      <button onClick={handleAbandon} className="text-xs text-muted-foreground mt-5 hover:text-foreground transition-colors cursor-pointer">
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
