import type { AppState, Chapter, StudySession } from "@/types";
import { addDays, daysBetween, todayISO } from "@/lib/utils";
import { recommendedReviewInterval } from "@/lib/scheduling/priority";

export function nextReviewDate(chapter: Chapter): string {
  const interval = recommendedReviewInterval(chapter);
  return addDays(chapter.lastReviewedAt ?? chapter.createdAt.slice(0, 10), interval);
}

export function getSessionsForDate(state: AppState, dateISO: string): StudySession[] {
  return state.studySessions
    .filter((s) => s.date === dateISO)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export interface DeadlineItem {
  id: string;
  kind: "exam" | "oral" | "assignment";
  title: string;
  subjectId: string;
  date: string;
  time?: string;
  importance: number;
}

export function getUpcomingDeadlines(state: AppState, limit = 5, horizonDays = 30): DeadlineItem[] {
  const today = todayISO();
  const items: DeadlineItem[] = [
    ...state.exams.map((e) => ({ id: e.id, kind: "exam" as const, title: e.name, subjectId: e.subjectId, date: e.date, importance: e.importance })),
    ...state.oralExams.map((o) => ({ id: o.id, kind: "oral" as const, title: o.theme, subjectId: o.subjectId, date: o.date, time: o.time, importance: o.importance })),
    ...state.assignments
      .filter((a) => !a.done)
      .map((a) => ({ id: a.id, kind: "assignment" as const, title: a.title, subjectId: a.subjectId, date: a.dueDate, importance: a.importance })),
  ];
  return items
    .filter((i) => {
      const d = daysBetween(today, i.date);
      return d >= -1 && d <= horizonDays;
    })
    .sort((a, b) => (a.date === b.date ? b.importance - a.importance : a.date.localeCompare(b.date)))
    .slice(0, limit);
}

export interface LinkedDeadline {
  id: string;
  kind: "exam" | "oral";
  title: string;
  date: string;
  time?: string;
  importance: number;
}

/** DS and colles a chapter is explicitly tied to (via their chapterIds), upcoming first —
 *  this is the only thing that connects an échéance to a chapter's revision priority; DM
 *  never link chapters, and mastery itself only moves when a session tied to the chapter
 *  is completed, not from the échéance existing. */
export function linkedDeadlinesForChapter(state: AppState, chapterId: string): LinkedDeadline[] {
  const today = todayISO();
  const items: LinkedDeadline[] = [
    ...state.exams
      .filter((e) => e.chapterIds.includes(chapterId))
      .map((e) => ({ id: e.id, kind: "exam" as const, title: e.name, date: e.date, importance: e.importance })),
    ...state.oralExams
      .filter((o) => o.chapterIds.includes(chapterId))
      .map((o) => ({ id: o.id, kind: "oral" as const, title: o.theme, date: o.date, time: o.time, importance: o.importance })),
  ];
  return items.filter((i) => daysBetween(today, i.date) >= -1).sort((a, b) => a.date.localeCompare(b.date));
}

export function dayProgress(state: AppState, dateISO: string) {
  const sessions = getSessionsForDate(state, dateISO).filter((s) => s.type !== "pause");
  const plannedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const doneMinutes = sessions.filter((s) => s.status === "termine").reduce((sum, s) => sum + s.durationMinutes, 0);
  const doneCount = sessions.filter((s) => s.status === "termine").length;
  return {
    sessions,
    plannedMinutes,
    doneMinutes,
    totalCount: sessions.length,
    doneCount,
    pct: sessions.length === 0 ? 0 : Math.round((doneCount / sessions.length) * 100),
  };
}
