import { clamp } from "@/lib/utils";

export interface PomodoroPlan {
  /** Length of each focus block, in minutes. */
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** How many focus cycles happen before a long break (instead of a short one). */
  cyclesBeforeLongBreak: number;
}

const MAX_FOCUS_MINUTES = 25;
/** Below this, a focus block isn't worth having — collapse everything into one block instead. */
const MIN_FOCUS_MINUTES = 10;
const CYCLES_BEFORE_LONG_BREAK = 4;

/**
 * Builds a Pomodoro plan sized to the session's own planned duration: longer sessions get
 * longer focus blocks (up to a 25min cap), shorter sessions get shorter ones, and a session
 * too short to produce at least a 10min block per cycle just runs as one uninterrupted block
 * instead (e.g. 15min stays 15min, not 2×6 with a break).
 *
 * Break lengths are computed from the total alone, never from the resulting cycle count —
 * that keeps them from swinging the focus length around whenever a session lands right on a
 * cycle-count boundary. The focus length itself is set to the smallest number of cycles that
 * keeps every block at or under the cap, which is why it isn't perfectly monotonic minute to
 * minute (a session just past a cap boundary needs an extra cycle and dips before climbing
 * back toward 25 again) — but a materially longer session never ends up with smaller focus
 * blocks than a shorter one.
 */
export function buildPomodoroPlan(totalMinutes: number): PomodoroPlan {
  const shortBreakMinutes = clamp(Math.round(totalMinutes * 0.045), 2, 8);
  const longBreakMinutes = clamp(shortBreakMinutes * 2, shortBreakMinutes, 15);

  const breaksForCycles = (n: number) => {
    const numLong = Math.floor((n - 1) / CYCLES_BEFORE_LONG_BREAK);
    const numShort = n - 1 - numLong;
    return numShort * shortBreakMinutes + numLong * longBreakMinutes;
  };

  let cycles = Math.max(1, Math.ceil(totalMinutes / MAX_FOCUS_MINUTES));
  while ((totalMinutes - breaksForCycles(cycles)) / cycles > MAX_FOCUS_MINUTES) cycles++;

  const focusMinutes = Math.round((totalMinutes - breaksForCycles(cycles)) / cycles);

  if (cycles === 1 || focusMinutes < MIN_FOCUS_MINUTES) {
    return { focusMinutes: totalMinutes, shortBreakMinutes: 0, longBreakMinutes: 0, cyclesBeforeLongBreak: 1 };
  }

  return { focusMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLongBreak: CYCLES_BEFORE_LONG_BREAK };
}
