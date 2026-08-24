import { clamp } from "@/lib/utils";

export interface PomodoroPlan {
  /** Length of each focus block, in minutes. */
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** How many focus cycles happen before a long break (instead of a short one). */
  cyclesBeforeLongBreak: number;
}

/** Below this, splitting into focus+break cycles isn't worth it — one uninterrupted block. */
const MIN_SPLITTABLE_MINUTES = 18;

/**
 * Builds a Pomodoro plan sized to the session's own planned duration instead of always
 * defaulting to 25/5 — a 30min session becomes 2×14min focus blocks with a 2min break
 * between them, a 3h pre-DS block becomes several ~20min blocks with periodic longer
 * breaks, so the whole cycle structure actually adds up to the time the student set aside.
 */
export function buildPomodoroPlan(totalMinutes: number): PomodoroPlan {
  if (totalMinutes <= MIN_SPLITTABLE_MINUTES) {
    return { focusMinutes: totalMinutes, shortBreakMinutes: 0, longBreakMinutes: 0, cyclesBeforeLongBreak: 1 };
  }

  // Shorter sessions get shorter focus blocks (so they still contain at least one break);
  // longer sessions settle into the classic ~25min Pomodoro block.
  const focusTarget = totalMinutes <= 90 ? 20 : 25;
  const cycles = Math.max(2, Math.round(totalMinutes / focusTarget));
  const cyclesBeforeLongBreak = 4;

  const shortBreakMinutes = clamp(Math.round(totalMinutes * 0.06), 2, 5);
  const longBreakMinutes = cycles > cyclesBeforeLongBreak ? Math.max(shortBreakMinutes * 2, 10) : shortBreakMinutes;

  const numLongBreaks = Math.floor((cycles - 1) / cyclesBeforeLongBreak);
  const numShortBreaks = cycles - 1 - numLongBreaks;
  const totalBreakMinutes = numShortBreaks * shortBreakMinutes + numLongBreaks * longBreakMinutes;

  const focusMinutes = Math.max(5, Math.round((totalMinutes - totalBreakMinutes) / cycles));

  return { focusMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLongBreak };
}
