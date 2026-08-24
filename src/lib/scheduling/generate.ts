import type { AppState, StudySession } from "@/types";
import { uid, addDays, todayISO, dayOfWeekFromDate, fromISODate, timeToMinutes, minutesToTime, clamp } from "@/lib/utils";
import { subtractIntervals, type Interval, intervalDuration } from "./intervals";
import { buildWorkPool, type WorkUnit } from "./priority";

const HORIZON_DAYS = 7;
const FILL_RATIO = 0.92; // use nearly all declared availability — the user already chose that time for revision
const MAX_DAILY_MINUTES = 600; // sanity backstop only (10h), not a normal-use constraint
const BREAK_MINUTES = 12;
export const MIN_SESSION_MINUTES = 20;
const DEFAULT_MAX_SESSIONS_PER_SUBJECT_PER_DAY = 3;

function freeWindowsForDate(
  state: AppState,
  dateISO: string,
  nowMinutes: number | null,
  excludeSessionId?: string
): Interval[] {
  const date = fromISODate(dateISO);
  const dow = dayOfWeekFromDate(date);

  const base: Interval[] = state.availability
    .filter((a) => a.dayOfWeek === dow)
    .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }));

  const busy: Interval[] = [];
  for (const c of state.courseEvents) {
    if (c.dayOfWeek === dow) busy.push({ start: timeToMinutes(c.startTime), end: timeToMinutes(c.endTime) });
  }
  for (const u of state.unavailablePeriods) {
    if (u.date === dateISO) busy.push({ start: timeToMinutes(u.startTime), end: timeToMinutes(u.endTime) });
  }
  for (const s of state.studySessions) {
    if (s.date === dateISO && s.status !== "ignore" && s.id !== excludeSessionId) {
      busy.push({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) });
    }
  }
  for (const o of state.oralExams) {
    // Only exams have no time recorded — colles do, and can fall inside evening
    // availability, so they need to actually block that time like anything else would.
    if (o.date === dateISO && o.time) busy.push({ start: timeToMinutes(o.time), end: timeToMinutes(o.time) + 60 });
  }
  if (nowMinutes !== null) busy.push({ start: 0, end: nowMinutes });

  return subtractIntervals(base, busy);
}

/** Public: free windows for a given date, used by the Planning UI to show open slots. */
export function computeFreeWindows(state: AppState, dateISO: string): Interval[] {
  const isToday = dateISO === todayISO();
  const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  return freeWindowsForDate(state, dateISO, nowMinutes);
}

/**
 * Whether [startMin, endMin) on this date sits entirely inside a single free window — i.e.
 * within declared availability, and not overlapping a course, another session, or a timed
 * colle. Used to keep manual adds, drags, and resizes from placing revision time somewhere
 * the student never actually said they'd be free.
 */
export function isSlotAvailable(state: AppState, dateISO: string, startMin: number, endMin: number, excludeSessionId?: string): boolean {
  const windows = freeWindowsForDate(state, dateISO, null, excludeSessionId);
  return windows.some((w) => startMin >= w.start && endMin <= w.end);
}

function makeSession(dateISO: string, start: number, unit: WorkUnit): StudySession {
  return {
    id: uid(),
    subjectId: unit.subjectId,
    chapterId: unit.chapterId,
    date: dateISO,
    startTime: minutesToTime(start),
    endTime: minutesToTime(start + unit.minutes),
    durationMinutes: unit.minutes,
    title: unit.title,
    type: unit.type,
    priority: unit.priority,
    priorityScore: unit.priorityScore,
    status: "a_faire",
    reason: unit.reason,
    sourceType: unit.sourceType,
    sourceId: unit.sourceId,
    actualMinutes: 0,
    auto: true,
    createdAt: new Date().toISOString(),
  };
}

function makeBreak(dateISO: string, start: number, minutes: number): StudySession {
  return {
    id: uid(),
    subjectId: null,
    chapterId: null,
    date: dateISO,
    startTime: minutesToTime(start),
    endTime: minutesToTime(start + minutes),
    durationMinutes: minutes,
    title: "Pause",
    type: "pause",
    priority: null,
    priorityScore: 0,
    status: "a_faire",
    reason: "",
    sourceType: null,
    sourceId: null,
    actualMinutes: 0,
    auto: true,
    createdAt: new Date().toISOString(),
  };
}

function isEligible(unit: WorkUnit, dateISO: string): boolean {
  if (unit.windowStart && dateISO < unit.windowStart) return false;
  if (unit.windowEnd && dateISO > unit.windowEnd) return false;
  return true;
}

/**
 * Deterministic scheduling algorithm. For each day, deadline-linked work (DS/colle/DM prep)
 * that specifically targets that day is placed first — almost regardless of the daily/subject
 * caps below — so a colle's "veille" review session actually lands the day before it, not
 * wherever the raw priority score happened to win first. Once targeted work is placed, the
 * remaining free time is filled greedily with the next-best eligible candidates (mostly spaced
 * repetition), capping subjects per day for variety and stopping well before a window is
 * completely full so the plan never feels crushing.
 */
export function generateSchedule(state: AppState): StudySession[] {
  const from = todayISO();
  const pool = buildWorkPool(state, from).filter((u) => u.fillWindow || u.minutes >= MIN_SESSION_MINUTES);
  const remaining = [...pool];
  const subjectWeekMinutes = new Map<string, number>();
  const maxSessionsPerSubject = new Map(state.subjects.map((s) => [s.id, s.maxSessionsPerDay || DEFAULT_MAX_SESSIONS_PER_SUBJECT_PER_DAY]));
  const generated: StudySession[] = [];

  for (let d = 0; d < HORIZON_DAYS; d++) {
    const dateISO = addDays(from, d);
    const isToday = d === 0;
    const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() + 15 : null;
    const windows = freeWindowsForDate(state, dateISO, nowMinutes);
    const dayBudget = windows.reduce((sum, w) => sum + intervalDuration(w), 0);
    if (dayBudget < MIN_SESSION_MINUTES) continue;

    // A "fillWindow" unit (e.g. the big review the evening before a DS) claims every free
    // window of the day for itself — nothing else gets scheduled alongside it.
    const fillIdx = remaining.findIndex((u) => u.fillWindow && u.targetDate === dateISO);
    if (fillIdx !== -1) {
      const unit = remaining.splice(fillIdx, 1)[0];
      for (const win of windows) {
        const minutes = intervalDuration(win);
        if (minutes < MIN_SESSION_MINUTES) continue;
        generated.push(makeSession(dateISO, win.start, { ...unit, minutes }));
        subjectWeekMinutes.set(unit.subjectId, (subjectWeekMinutes.get(unit.subjectId) ?? 0) + minutes);
      }
      continue;
    }

    const targetFill = clamp(dayBudget * FILL_RATIO, 0, MAX_DAILY_MINUTES);
    let usedToday = 0;
    const subjectDayCount = new Map<string, number>();

    for (const win of windows) {
      let cursor = win.start;
      let remainingInWindow = intervalDuration(win);

      // Keep pulling the best-fitting candidate until this window (or the daily budget) is exhausted.
      for (;;) {
        if (remainingInWindow < MIN_SESSION_MINUTES) break;
        if (usedToday >= MAX_DAILY_MINUTES) break;

        // Deadline work reserved for exactly this day bypasses the soft daily-fill target and
        // the per-subject cap: it MUST land here to actually be useful, even if that means two
        // sessions of the same subject or slightly more work than a "typical" evening.
        let candidateIdx = pickTargetedCandidate(remaining, dateISO, remainingInWindow);
        if (candidateIdx === -1) {
          if (usedToday >= targetFill) break;
          candidateIdx = pickBestCandidate(remaining, dateISO, remainingInWindow, subjectDayCount, subjectWeekMinutes, maxSessionsPerSubject);
        }
        if (candidateIdx === -1) break;

        const unit = remaining.splice(candidateIdx, 1)[0];
        const minutes = Math.min(unit.minutes, remainingInWindow);
        const session = makeSession(dateISO, cursor, { ...unit, minutes });
        generated.push(session);

        cursor += minutes;
        remainingInWindow -= minutes;
        usedToday += minutes;
        subjectWeekMinutes.set(unit.subjectId, (subjectWeekMinutes.get(unit.subjectId) ?? 0) + minutes);
        subjectDayCount.set(unit.subjectId, (subjectDayCount.get(unit.subjectId) ?? 0) + 1);

        const wantsBreak = minutes >= 35 && remainingInWindow >= MIN_SESSION_MINUTES + BREAK_MINUTES;
        if (wantsBreak && usedToday < MAX_DAILY_MINUTES) {
          generated.push(makeBreak(dateISO, cursor, BREAK_MINUTES));
          cursor += BREAK_MINUTES;
          remainingInWindow -= BREAK_MINUTES;
        }
      }
    }
  }

  return generated;
}

/**
 * "Reserved" candidates: units anchored to a deadline whose window includes today. Since
 * their window always starts exactly at their target day (see distributeTargets), being
 * eligible here means today either IS the target day or is the one-day fallback right after
 * it (used when the target day itself turned out fully booked) — never an early grab.
 */
function pickTargetedCandidate(pool: WorkUnit[], dateISO: string, maxMinutes: number): number {
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    const unit = pool[i];
    if (unit.targetDate === null || !isEligible(unit, dateISO)) continue;
    if (unit.minutes > maxMinutes && maxMinutes < MIN_SESSION_MINUTES) continue;
    // Prefer whichever reserved unit's target day is most imminent, so a fallback slot
    // never gets claimed by a unit that still has room to wait for its actual target day.
    const score = unit.priorityScore + (unit.targetDate === dateISO ? 1000 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function pickBestCandidate(
  pool: WorkUnit[],
  dateISO: string,
  maxMinutes: number,
  subjectDayCount: Map<string, number>,
  subjectWeekMinutes: Map<string, number>,
  maxSessionsPerSubject: Map<string, number>
): number {
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    const unit = pool[i];
    if (!isEligible(unit, dateISO)) continue;
    if (unit.minutes > maxMinutes && maxMinutes < MIN_SESSION_MINUTES) continue;
    const dayCount = subjectDayCount.get(unit.subjectId) ?? 0;
    const dayCap = maxSessionsPerSubject.get(unit.subjectId) ?? DEFAULT_MAX_SESSIONS_PER_SUBJECT_PER_DAY;
    if (dayCount >= dayCap) continue;
    // Balance across the week: a subject that already got a lot of time this week is deprioritized.
    const weekMinutes = subjectWeekMinutes.get(unit.subjectId) ?? 0;
    const effectiveScore = unit.priorityScore / (1 + weekMinutes / 120);
    if (effectiveScore > bestScore) {
      bestScore = effectiveScore;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Finds the next relevant free slot for a session that was removed or skipped, and
 * re-inserts it there instead of losing it. Searches forward day by day.
 */
export function rescheduleSession(state: AppState, session: StudySession): StudySession | null {
  const startFrom = addDays(todayISO(), 0);
  for (let d = 0; d < 14; d++) {
    const dateISO = addDays(startFrom, d);
    const isToday = d === 0;
    const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() + 15 : null;
    const windows = freeWindowsForDate(state, dateISO, nowMinutes);
    for (const win of windows) {
      const duration = intervalDuration(win);
      if (duration >= session.durationMinutes) {
        return {
          ...session,
          id: uid(),
          date: dateISO,
          startTime: minutesToTime(win.start),
          endTime: minutesToTime(win.start + session.durationMinutes),
          status: "a_faire",
          reason: `${session.reason} (reprogrammé)`.trim(),
          createdAt: new Date().toISOString(),
        };
      }
      if (duration >= MIN_SESSION_MINUTES) {
        const minutes = duration;
        return {
          ...session,
          id: uid(),
          date: dateISO,
          startTime: minutesToTime(win.start),
          endTime: minutesToTime(win.start + minutes),
          durationMinutes: minutes,
          status: "a_faire",
          reason: `${session.reason} (reprogrammé, raccourci)`.trim(),
          createdAt: new Date().toISOString(),
        };
      }
    }
  }
  return null;
}
