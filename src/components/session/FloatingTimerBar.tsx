"use client";

import { Coffee, Maximize2, Pause, Play, Target } from "lucide-react";
import { subjectColorVar } from "@/lib/subjects";
import type { SessionTimerEngine } from "@/lib/session/useSessionTimerEngine";
import { cn } from "@/lib/utils";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Persistent mini widget shown on every page while a session is running but the full timer
 * is collapsed — this is what makes the timer actually survive navigation from the user's
 * point of view: it stays visible and tickable no matter which page they're looking at.
 */
export function FloatingTimerBar({ engine, onExpand }: { engine: SessionTimerEngine; onExpand: () => void }) {
  const { session, subject, mode, running, pomo, toggleRunning } = engine;
  if (!session) return null;

  const color = subject ? subjectColorVar(subject.colorKey) : "var(--accent)";
  const isBreak = mode === "pomodoro" && pomo.phase !== "focus";
  const clock = mode === "simple" ? formatClock(pomo.focusSeconds) : formatClock(pomo.phaseSecondsLeft);

  return (
    <div className="fixed inset-x-0 bottom-16 md:bottom-5 z-40 flex justify-center md:justify-end pointer-events-none px-3 md:pl-64 md:pr-6">
      <button
        onClick={onExpand}
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-border-soft bg-surface/95 backdrop-blur-xl shadow-[var(--shadow-pop)] pl-3 pr-2 py-2 hover:bg-surface-hover transition-colors cursor-pointer max-w-full"
        aria-label="Agrandir le minuteur"
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: isBreak ? "var(--success)" : color }} />
        <span className="flex items-center gap-1.5 min-w-0">
          {mode === "pomodoro" && (isBreak ? <Coffee size={13} className="text-success shrink-0" /> : <Target size={13} className="shrink-0" style={{ color }} />)}
          <span className="text-[13px] font-medium truncate max-w-[9rem] sm:max-w-[14rem]">{session.title}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums tracking-tight shrink-0">{clock}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            toggleRunning();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              toggleRunning();
            }
          }}
          className={cn(
            "h-7 w-7 shrink-0 flex items-center justify-center rounded-full transition-colors cursor-pointer",
            "bg-surface-hover hover:brightness-110"
          )}
          aria-label={running ? "Mettre en pause" : "Reprendre"}
        >
          {running ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
        </span>
        <Maximize2 size={13} className="text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}
