import type { AppState, Chapter, SessionType } from "@/types";
import { addDays, clamp, clampISO, daysBetween, todayISO } from "@/lib/utils";

/** One candidate slice of work the allocator can drop into a slot. */
export interface WorkUnit {
  subjectId: string;
  chapterId: string | null;
  type: SessionType;
  title: string;
  reason: string;
  minutes: number;
  priority: "haute" | "moyenne" | "basse";
  priorityScore: number;
  sourceType: "exam" | "oral" | "assignment" | "spaced";
  sourceId: string | null;
  dueDate: string | null;
  /**
   * Days this unit is allowed to land on. `null` means unconstrained (used for
   * spaced-repetition filler). Deadline-linked work always gets a window that ends
   * before its deadline, so review naturally clusters close to the exam/colle/DM
   * instead of being scattered anywhere the raw priority score happens to win.
   */
  windowStart: string | null;
  windowEnd: string | null;
  /** Preferred day within the window — the allocator tries hard to honor this exactly. */
  targetDate: string | null;
  /**
   * When true, this unit claims the ENTIRE free time of its target day for itself (e.g. the
   * big, uncapped consolidation block the evening before a DS) — `minutes` is a placeholder,
   * ignored by the allocator, which sizes the session to whatever free time that day has.
   */
  fillWindow?: boolean;
}

const HORIZON_URGENCY_DAYS = 14;
const EPS = 0.08; // floor so a single weak factor doesn't zero out the whole score

function urgencyFromDueDate(daysUntil: number): number {
  if (daysUntil < 0) return 1; // overdue: treat as maximally urgent
  return clamp(1 - daysUntil / HORIZON_URGENCY_DAYS, EPS, 1);
}

/**
 * Combines urgency with secondary factors so urgency stays the dominant driver: each extra
 * factor only compresses the score between 50% and 100% of itself, instead of being able to
 * zero it out the way a plain product would. A close deadline should outrank a well-mastered
 * one even if the latter is harder or more important.
 */
function weightedScore(urgency: number, ...factors: number[]): number {
  const modifier = factors.reduce((acc, f) => acc * (0.5 + 0.5 * f), 1);
  return urgency * modifier;
}

function priorityLabel(score: number): "haute" | "moyenne" | "basse" {
  if (score >= 0.5) return "haute";
  if (score >= 0.22) return "moyenne";
  return "basse";
}

/** Recommended interval (days) between reviews, shorter for weak/hard chapters. */
export function recommendedReviewInterval(chapter: Chapter): number {
  const masteryFactor = chapter.mastery / 100; // 0..1
  const difficultyFactor = (chapter.difficulty - 1) / 4; // 0..1
  const interval = 3 + masteryFactor * 9 - difficultyFactor * 2;
  return clamp(interval, 2, 12);
}

function sessionMinutesForChapter(chapter: Chapter, urgencyBoost: number): number {
  const masteryNeed = (100 - chapter.mastery) / 100;
  const base = 25 + chapter.difficulty * 4 + masteryNeed * 20 + urgencyBoost * 10;
  return Math.round(clamp(base, 25, 60) / 5) * 5;
}

/** How many separate sessions this chapter should get this cycle (spacing beats one mega-block). */
function sessionsNeeded(chapter: Chapter, urgency: number): number {
  const masteryNeed = (100 - chapter.mastery) / 100;
  let n = 1;
  if (masteryNeed > 0.45) n += 1;
  if (urgency > 0.7 && masteryNeed > 0.3) n += 1;
  return clamp(n, 1, 3);
}

/**
 * Spreads `n` sub-sessions evenly across [windowStart, windowEnd], with the last one
 * landing right at windowEnd (closest to the deadline) — so a chapter that needs two
 * passes gets one earlier in the week and one as final consolidation just before it's due,
 * instead of both happening today because "today" is processed first.
 *
 * Each sub-session's own window starts exactly AT its target day (never earlier) — only
 * slipping later, by one day, if that day turns out to be fully booked. Allowing it to also
 * land on earlier days would mean it just gets grabbed opportunistically by whichever day the
 * allocator reaches first, defeating the whole point of anchoring review close to the deadline.
 */
function distributeTargets(n: number, windowStart: string, windowEnd: string) {
  const span = Math.max(0, daysBetween(windowStart, windowEnd));
  const out: { target: string; windowStart: string; windowEnd: string }[] = [];
  for (let i = 0; i < n; i++) {
    const frac = n === 1 ? 1 : (i + 1) / n;
    const offset = Math.round(span * frac);
    const target = addDays(windowStart, Math.min(span, offset));
    out.push({
      target,
      windowStart: target,
      windowEnd: clampISO(addDays(target, 1), windowStart, windowEnd),
    });
  }
  return out;
}

/**
 * Build the full candidate pool of work units for the upcoming horizon.
 * priorityScore = urgency * difficulty * masteryNeed * importance (each 0..1, floored at EPS)
 * so a chapter that is both close to a deadline AND poorly mastered naturally rises to the top.
 * Deadline-linked units additionally carry a scheduling window so they land near that deadline
 * (see distributeTargets and the colle-specific "2 jours avant / veille" split below) rather than
 * being placed purely by score wherever the greedy allocator first has room.
 */
export function buildWorkPool(state: AppState, fromISO: string = todayISO()): WorkUnit[] {
  const pool: WorkUnit[] = [];
  const chapterById = new Map(state.chapters.map((c) => [c.id, c]));
  const subjectById = new Map(state.subjects.map((s) => [s.id, s]));

  // Track, per chapter, the strongest deadline driving it (for spaced-repetition fallback).
  const linkedChapterIds = new Set<string>();

  for (const exam of state.exams) {
    const daysUntil = daysBetween(fromISO, exam.date);
    if (daysUntil < 0 || daysUntil > HORIZON_URGENCY_DAYS) continue;
    const urgency = urgencyFromDueDate(daysUntil);
    const importance = clamp(exam.importance / 5, EPS, 1);
    const subject = subjectById.get(exam.subjectId);
    if (!subject) continue;

    // The evening before the exam ("la veille") is reserved entirely for one big, uncapped
    // consolidation block — see the fillWindow push below. Chapters instead get their lighter,
    // spread-out review earlier in the week, stopping the day before that reserved evening
    // (unless the exam is tomorrow/today, in which case there's no "earlier in the week" left).
    const examEve = clampISO(addDays(exam.date, -1), fromISO, exam.date);
    const chapterWindowEnd = daysUntil >= 2 ? clampISO(addDays(exam.date, -2), fromISO, exam.date) : examEve;
    const chapters = exam.chapterIds.map((id) => chapterById.get(id)).filter(Boolean) as Chapter[];
    for (const chapter of chapters) {
      linkedChapterIds.add(chapter.id);
      const difficulty = clamp(chapter.difficulty / 5, EPS, 1);
      const masteryNeed = clamp((100 - chapter.mastery) / 100, EPS, 1);
      const score = weightedScore(urgency, difficulty, masteryNeed, importance);
      const n = sessionsNeeded(chapter, urgency);
      const minutes = sessionMinutesForChapter(chapter, urgency);
      const targets = distributeTargets(n, fromISO, chapterWindowEnd);
      targets.forEach((t, i) => {
        pool.push({
          subjectId: subject.id,
          chapterId: chapter.id,
          type: "exercices",
          title: chapter.name,
          reason: `DS ${relativeLabel(daysUntil)} · maîtrise ${chapter.mastery}%`,
          minutes,
          priority: priorityLabel(score),
          priorityScore: score * (1 - i * 0.1),
          sourceType: "exam",
          sourceId: exam.id,
          dueDate: exam.date,
          windowStart: t.windowStart,
          windowEnd: t.windowEnd,
          targetDate: t.target,
        });
      });
    }

    // Big, uncapped consolidation block the evening before the exam — claims the whole
    // free window that day so nothing else gets scheduled alongside it (skipped if the
    // exam itself is today, since there's no "veille" left to schedule).
    if (daysUntil >= 1) {
      const eveUrgency = urgencyFromDueDate(daysBetween(fromISO, examEve));
      const score = weightedScore(eveUrgency, importance);
      pool.push({
        subjectId: subject.id,
        chapterId: null,
        type: "preparation_ds",
        title: exam.name,
        reason: `DS ${relativeLabel(daysUntil)} · grosse révision`,
        minutes: 60,
        priority: priorityLabel(score),
        priorityScore: score,
        sourceType: "exam",
        sourceId: exam.id,
        dueDate: exam.date,
        windowStart: examEve,
        windowEnd: examEve,
        targetDate: examEve,
        fillWindow: true,
      });
    }
  }

  for (const oral of state.oralExams) {
    const daysUntil = daysBetween(fromISO, oral.date);
    if (daysUntil < 0 || daysUntil > HORIZON_URGENCY_DAYS) continue;
    const importance = clamp(oral.importance / 5, EPS, 1);
    const subject = subjectById.get(oral.subjectId);
    if (!subject) continue;

    // "La veille, une bonne heure prévue pour réviser la colle." The window starts exactly
    // on that day (never earlier — see distributeTargets for why) and only slips one day
    // later, toward the colle itself, if the day-before is genuinely fully booked.
    const deepTarget = clampISO(addDays(oral.date, -1), fromISO, oral.date);
    const deepWindowEnd = clampISO(addDays(deepTarget, 1), fromISO, oral.date);
    const deepUrgency = urgencyFromDueDate(daysBetween(fromISO, deepTarget));

    const chapters = oral.chapterIds.map((id) => chapterById.get(id)).filter(Boolean) as Chapter[];
    chapters.forEach((c) => linkedChapterIds.add(c.id));

    if (chapters.length === 0) {
      const score = weightedScore(deepUrgency, importance);
      pool.push({
        subjectId: subject.id,
        chapterId: null,
        type: "preparation_colle",
        title: oral.theme,
        reason: `Colle ${relativeLabel(daysUntil)}`,
        minutes: 50,
        priority: priorityLabel(score),
        priorityScore: score,
        sourceType: "oral",
        sourceId: oral.id,
        dueDate: oral.date,
        windowStart: deepTarget,
        windowEnd: deepWindowEnd,
        targetDate: deepTarget,
      });
    } else {
      // Split the "solid hour" across chapters, weighted by how much work each still needs.
      const weights = chapters.map((c) => clamp((100 - c.mastery) / 100, 0.15, 1) * clamp(c.difficulty / 5, 0.4, 1));
      const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
      const budget = 55;
      chapters.forEach((chapter, idx) => {
        const minutes = clamp(Math.round((weights[idx] / totalWeight) * budget / 5) * 5, 15, 45);
        const difficulty = clamp(chapter.difficulty / 5, EPS, 1);
        const masteryNeed = clamp((100 - chapter.mastery) / 100, EPS, 1);
        const score = weightedScore(deepUrgency, difficulty, masteryNeed, importance);
        pool.push({
          subjectId: subject.id,
          chapterId: chapter.id,
          type: "preparation_colle",
          title: `${oral.theme} — ${chapter.name}`,
          reason: `Colle ${relativeLabel(daysUntil)} · maîtrise ${chapter.mastery}%`,
          minutes,
          priority: priorityLabel(score),
          priorityScore: score,
          sourceType: "oral",
          sourceId: oral.id,
          dueDate: oral.date,
          windowStart: deepTarget,
          windowEnd: deepWindowEnd,
          targetDate: deepTarget,
        });
      });
    }

    // "Deux jours avant, regarder rapidement le programme." Only makes sense with enough lead time.
    if (daysUntil >= 2) {
      const quickTarget = addDays(oral.date, -2);
      const quickUrgency = urgencyFromDueDate(daysBetween(fromISO, quickTarget));
      const score = weightedScore(quickUrgency, importance) * 0.6;
      pool.push({
        subjectId: subject.id,
        chapterId: null,
        type: "preparation_colle",
        title: `${oral.theme} (aperçu)`,
        reason: `Colle ${relativeLabel(daysUntil)} · relecture rapide du programme`,
        minutes: 25,
        priority: priorityLabel(score),
        priorityScore: score,
        sourceType: "oral",
        sourceId: oral.id,
        dueDate: oral.date,
        windowStart: quickTarget,
        windowEnd: quickTarget,
        targetDate: quickTarget,
      });
    }
  }

  for (const assignment of state.assignments) {
    if (assignment.done) continue;
    const daysUntil = daysBetween(fromISO, assignment.dueDate);
    if (daysUntil < 0 || daysUntil > HORIZON_URGENCY_DAYS) continue;
    const importance = clamp(assignment.importance / 5, EPS, 1);
    const subject = subjectById.get(assignment.subjectId);
    if (!subject) continue;

    const windowStart = clampISO(addDays(assignment.dueDate, -4), fromISO, assignment.dueDate);
    const windowEnd = clampISO(addDays(assignment.dueDate, -1), fromISO, assignment.dueDate);
    const chunks = clamp(Math.ceil(assignment.estimatedDuration / 50), 1, 3);
    const minutesPerChunk = clamp(Math.round(assignment.estimatedDuration / chunks / 5) * 5, 20, 60);
    const targets = distributeTargets(chunks, windowStart, windowEnd);
    targets.forEach((t, i) => {
      const urgency = urgencyFromDueDate(daysBetween(fromISO, t.target));
      const score = weightedScore(urgency, importance) * (1 - i * 0.08);
      pool.push({
        subjectId: subject.id,
        chapterId: null,
        type: "devoir",
        title: assignment.title,
        reason: `DM à rendre ${relativeLabel(daysUntil)}`,
        minutes: minutesPerChunk,
        priority: priorityLabel(score),
        priorityScore: score,
        sourceType: "assignment",
        sourceId: assignment.id,
        dueDate: assignment.dueDate,
        windowStart: t.windowStart,
        windowEnd: t.windowEnd,
        targetDate: t.target,
      });
    });
  }

  // Spaced repetition fallback: chapters with no upcoming deadline but overdue for review.
  for (const chapter of state.chapters) {
    if (linkedChapterIds.has(chapter.id)) continue;
    const subject = subjectById.get(chapter.subjectId);
    if (!subject) continue;
    const interval = recommendedReviewInterval(chapter);
    const daysSince = chapter.lastReviewedAt ? daysBetween(chapter.lastReviewedAt, fromISO) : 999;
    const overdueRatio = daysSince / interval;
    if (overdueRatio < 0.85) continue; // not due yet

    const urgency = clamp(overdueRatio - 0.5, EPS, 1);
    const difficulty = clamp(chapter.difficulty / 5, EPS, 1);
    const masteryNeed = clamp((100 - chapter.mastery) / 100, EPS, 1);
    const importance = 0.45; // baseline importance for non-deadline-linked review
    const score = weightedScore(urgency, difficulty, masteryNeed, importance);
    pool.push({
      subjectId: subject.id,
      chapterId: chapter.id,
      type: "revision",
      title: chapter.name,
      reason: chapter.lastReviewedAt
        ? `Pas revu depuis ${daysSince} jours · maîtrise ${chapter.mastery}%`
        : `Jamais revu · maîtrise ${chapter.mastery}%`,
      minutes: sessionMinutesForChapter(chapter, urgency),
      priority: priorityLabel(score),
      priorityScore: score,
      sourceType: "spaced",
      sourceId: null,
      dueDate: null,
      windowStart: null,
      windowEnd: null,
      targetDate: null,
    });
  }

  return pool.sort((a, b) => b.priorityScore - a.priorityScore);
}

function relativeLabel(daysUntil: number): string {
  if (daysUntil < 0) return "passé(e)";
  if (daysUntil === 0) return "aujourd'hui";
  if (daysUntil === 1) return "demain";
  return `dans ${daysUntil} j`;
}
