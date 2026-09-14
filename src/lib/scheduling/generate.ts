import type { AppState, StudySession } from "@/types";
import { uid, addDays, todayISO, dayOfWeekFromDate, fromISODate, timeToMinutes, minutesToTime, clamp } from "@/lib/utils";
import { subtractIntervals, type Interval, intervalDuration } from "./intervals";
import { buildColleSoakUnit, buildDailyReviewUnits, buildWorkPool, type WorkUnit } from "./priority";

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
 * What counts as "the same thing to work on" for grouping. A colle's chapters all key on the
 * colle, so its scattered pieces end up side by side rather than at either end of the evening.
 */
function topicKey(s: StudySession): string {
  if (s.sourceId) return `source:${s.sourceId}`;
  if (s.chapterId) return `chapter:${s.chapterId}`;
  return `subject:${s.subjectId}:${s.type}`;
}

/** Literally the same work, and so safe to fuse into one longer block without losing meaning. */
function isSameWork(a: StudySession, b: StudySession): boolean {
  return (
    a.type === b.type &&
    a.subjectId === b.subjectId &&
    a.chapterId === b.chapterId &&
    a.sourceId === b.sourceId &&
    a.title === b.title
  );
}

/**
 * Re-lays one window so each topic is done in a single stretch.
 *
 * The allocator picks work by priority, which naturally interleaves: the colle's reserved prep
 * lands first, re-reads and spaced repetition follow, then the leftover-time filler returns to
 * that same colle hours later. Correct by priority, miserable to actually sit through — every
 * hand-off costs you the context you'd just built up. So once a day's work is chosen, it gets
 * reordered: topics keep their priority order by first appearance, but all of a topic's blocks
 * move together, and identical repeats fuse into one uninterrupted block. Breaks survive only
 * between topics, where the switch is real, never inside a stretch on one subject.
 *
 * Only the order and the block boundaries change here — never which work was chosen, nor how
 * many minutes it gets.
 */
function regroupWindow(blocks: StudySession[], win: Interval, dateISO: string, filledTo: number): StudySession[] {
  if (blocks.length === 0) return [];

  const order: string[] = [];
  const byTopic = new Map<string, StudySession[]>();
  for (const b of blocks) {
    const key = topicKey(b);
    if (!byTopic.has(key)) {
      byTopic.set(key, []);
      order.push(key);
    }
    byTopic.get(key)!.push(b);
  }

  const merged: { topic: string; session: StudySession }[] = [];
  for (const key of order) {
    for (const b of byTopic.get(key)!) {
      const last = merged[merged.length - 1];
      if (last && last.topic === key && isSameWork(last.session, b)) {
        last.session = { ...last.session, durationMinutes: last.session.durationMinutes + b.durationMinutes };
      } else {
        merged.push({ topic: key, session: b });
      }
    }
  }

  const out: StudySession[] = [];
  let cursor = win.start;
  let workLeft = merged.reduce((sum, m) => sum + m.session.durationMinutes, 0);

  merged.forEach((m, i) => {
    // A break belongs at a topic change, but only after a stretch long enough to have earned
    // one — a couple of 25min re-readings back to back don't need a pause wedged between them.
    // And dropping the breaks that used to sit mid-stretch frees time, so it only goes in when
    // everything still to place fits after it.
    const previous = i > 0 ? merged[i - 1] : null;
    const earnedBreak = previous !== null && previous.topic !== m.topic && previous.session.durationMinutes >= 35;
    if (earnedBreak && win.end - cursor - BREAK_MINUTES >= workLeft) {
      out.push(makeBreak(dateISO, cursor, BREAK_MINUTES));
      cursor += BREAK_MINUTES;
    }
    let minutes = m.session.durationMinutes;
    // Fewer breaks would otherwise end an evening that was full a few minutes early; hand those
    // minutes to the last block instead, but only when the window really was filled to the brim.
    if (i === merged.length - 1 && filledTo >= win.end - BREAK_MINUTES && cursor + minutes < win.end) {
      minutes = win.end - cursor;
    }
    out.push({
      ...m.session,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + minutes),
      durationMinutes: minutes,
    });
    cursor += minutes;
    workLeft -= m.session.durationMinutes;
  });

  return out;
}

/**
 * Deterministic scheduling algorithm. Deadline-linked work (DS/colle/DM prep) that specifically
 * targets a day is placed first — almost regardless of the daily/subject caps below — so a
 * colle's "veille" review session actually lands the day before it, not wherever the raw
 * priority score happened to win first. Next come that day's course re-reads (see
 * buildDailyReviewUnits), which are a daily habit rather than a deadline and so yield to one.
 * Once both are placed, the
 * remaining free time is filled greedily with the next-best eligible candidates (mostly spaced
 * repetition), capping subjects per day for variety and stopping well before a window is
 * completely full so the plan never feels crushing.
 *
 * That last restraint is dropped on the eve of a colle: rather than stopping early and leaving
 * the evening half empty, whatever time is left over goes back into revising that colle (see
 * buildColleSoakUnit).
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
    // Placed after any deadline work targeting this day, but ahead of the greedy fill.
    const dailyReview = buildDailyReviewUnits(state, dateISO);
    // Last in line: repeated to fill whatever is still empty when a colle is tomorrow.
    const colleSoak = buildColleSoakUnit(state, dateISO);

    for (const win of windows) {
      let cursor = win.start;
      let remainingInWindow = intervalDuration(win);
      // Collected rather than emitted straight away: the order work is *chosen* in is priority
      // order, which is not the order it should be *sat through* (see regroupWindow).
      const placed: StudySession[] = [];

      // Keep pulling the best-fitting candidate until this window (or the daily budget) is exhausted.
      for (;;) {
        if (remainingInWindow < MIN_SESSION_MINUTES) break;
        if (usedToday >= MAX_DAILY_MINUTES) break;

        // Deadline work reserved for exactly this day goes first. It bypasses the soft
        // daily-fill target and the per-subject cap — it MUST land here to be useful at all —
        // and it outranks the day's re-reads: a colle or a DS is time-critical in a way that
        // re-reading today's courses is not. Behind the re-reads, a heavy course day's three
        // relectures would swallow a short evening whole and leave the colle nothing.
        const targetedIdx = pickTargetedCandidate(remaining, dateISO, remainingInWindow);
        let unit: WorkUnit | null =
          targetedIdx !== -1 ? remaining.splice(targetedIdx, 1)[0] : (dailyReview.shift() ?? null);

        if (!unit) {
          const bestIdx =
            usedToday < targetFill
              ? pickBestCandidate(remaining, dateISO, remainingInWindow, subjectDayCount, subjectWeekMinutes, maxSessionsPerSubject)
              : -1;

          if (bestIdx !== -1) {
            unit = remaining.splice(bestIdx, 1)[0];
          } else if (colleSoak) {
            // Nothing left worth scheduling, but tomorrow is a colle: spend the rest of the
            // evening on it rather than stopping early and leaving the time blank.
            unit = { ...colleSoak, minutes: Math.min(colleSoak.minutes, remainingInWindow) };
          } else {
            break;
          }
        }

        const minutes = Math.min(unit.minutes, remainingInWindow);
        placed.push(makeSession(dateISO, cursor, { ...unit, minutes }));

        cursor += minutes;
        remainingInWindow -= minutes;
        usedToday += minutes;
        subjectWeekMinutes.set(unit.subjectId, (subjectWeekMinutes.get(unit.subjectId) ?? 0) + minutes);
        subjectDayCount.set(unit.subjectId, (subjectDayCount.get(unit.subjectId) ?? 0) + 1);

        // Break time is still reserved while choosing, so the day can't be over-packed; where
        // the breaks actually end up is regroupWindow's call, once the running order is known.
        const wantsBreak = minutes >= 35 && remainingInWindow >= MIN_SESSION_MINUTES + BREAK_MINUTES;
        if (wantsBreak && usedToday < MAX_DAILY_MINUTES) {
          cursor += BREAK_MINUTES;
          remainingInWindow -= BREAK_MINUTES;
        }
      }

      generated.push(...regroupWindow(placed, win, dateISO, cursor));
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
