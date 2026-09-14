import type { Exercise, ExerciseRating } from "@/types";
import { addDays, clamp, todayISO } from "@/lib/utils";

export const RATINGS: { value: ExerciseRating; label: string; hint: string }[] = [
  { value: "rate", label: "Raté", hint: "à revoir tout de suite" },
  { value: "difficile", label: "Difficile", hint: "retrouvé, mais péniblement" },
  { value: "bien", label: "Bien", hint: "su, sans blocage" },
  { value: "facile", label: "Facile", hint: "évident" },
];

/**
 * How fast an exercise's interval grows, in the SM-2 sense. Starts at DEFAULT and drifts with
 * your answers, so an exercise you keep finding hard settles into short intervals of its own
 * accord while one you always nail spaces itself out fast.
 */
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;

/** Intervals for the first two successful reviews, before the ease factor takes over. */
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 3;
const MAX_INTERVAL_DAYS = 365;

export function newExerciseSchedule(): Pick<
  Exercise,
  "intervalDays" | "ease" | "streak" | "reviewCount" | "lastReviewedAt" | "dueDate"
> {
  return { intervalDays: 0, ease: DEFAULT_EASE, streak: 0, reviewCount: 0, lastReviewedAt: null, dueDate: todayISO() };
}

/**
 * Applies a rating and returns the exercise's new schedule — this is the forgetting curve.
 *
 * "Raté" sends it back to the end of today's queue rather than out to tomorrow, so a blank is
 * re-attempted while the correction is still fresh; the other three push the next review out by
 * a growing multiple of the current interval. Getting something right repeatedly is what makes
 * it disappear from the list for weeks, and a single lapse is what brings it straight back.
 */
export function applyRating(exercise: Exercise, rating: ExerciseRating, today = todayISO()) {
  const previous = exercise.intervalDays;

  let ease = exercise.ease || DEFAULT_EASE;
  let streak = exercise.streak;
  let intervalDays: number;

  switch (rating) {
    case "rate":
      ease -= 0.2;
      streak = 0;
      intervalDays = 0; // back in today's queue
      break;
    case "difficile":
      ease -= 0.15;
      streak += 1;
      // At least a day longer than last time, not just 1.2x: rounding 1.2 back down to 1 would
      // pin an exercise you always find hard to the daily queue for ever, never spacing at all.
      intervalDays = previous === 0 ? FIRST_INTERVAL_DAYS : Math.max(previous + 1, Math.round(previous * 1.2));
      break;
    case "bien":
      streak += 1;
      intervalDays =
        streak === 1 ? FIRST_INTERVAL_DAYS : streak === 2 ? SECOND_INTERVAL_DAYS : Math.round(previous * ease);
      break;
    case "facile":
      ease += 0.15;
      streak += 1;
      intervalDays =
        streak === 1 ? SECOND_INTERVAL_DAYS : Math.round(Math.max(previous, FIRST_INTERVAL_DAYS) * ease * 1.3);
      break;
  }

  ease = clamp(ease, MIN_EASE, MAX_EASE);
  intervalDays = clamp(intervalDays, 0, MAX_INTERVAL_DAYS);

  return {
    intervalDays,
    ease,
    streak,
    reviewCount: exercise.reviewCount + 1,
    lastReviewedAt: today,
    dueDate: addDays(today, intervalDays),
  };
}

/**
 * What each button will do to the next review, shown on the buttons so the choice is informed.
 * Weeks fill the gap between days and months on purpose: rounded straight to months, "Bien"
 * (75j) and "Facile" (98j) both read "3 mois" and the two buttons stop being distinguishable.
 */
export function previewInterval(exercise: Exercise, rating: ExerciseRating, today = todayISO()): string {
  const { intervalDays } = applyRating(exercise, rating, today);
  if (intervalDays === 0) return "maintenant";
  if (intervalDays === 1) return "demain";
  if (intervalDays < 21) return `${intervalDays} j`;
  if (intervalDays < 120) return `${Math.round(intervalDays / 7)} sem`;
  if (intervalDays < 365) return `${Math.round(intervalDays / 30)} mois`;
  const years = Math.round(intervalDays / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}

export function isDue(exercise: Exercise, today = todayISO()): boolean {
  return exercise.dueDate <= today;
}

/** Due exercises, longest-overdue first so the most faded come back before the rest. */
export function dueExercises(exercises: Exercise[], today = todayISO()): Exercise[] {
  return exercises
    .filter((e) => isDue(e, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt));
}

/** Mastery nudge applied to the exercise's chapter, so drilling feeds the planning generator. */
export const MASTERY_DELTA: Record<ExerciseRating, number> = {
  rate: -4,
  difficile: 1,
  bien: 3,
  facile: 5,
};
