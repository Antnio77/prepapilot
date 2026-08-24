import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppState,
  Assignment,
  AvailabilityBlock,
  Chapter,
  CourseEvent,
  Exam,
  OralExam,
  StudySession,
  Subject,
  UnavailablePeriod,
} from "@/types";

/**
 * Whole-state mirror sync: instead of wiring every one of the store's ~30 mutation
 * actions to also call Supabase individually (easy to miss one), we treat Supabase as a
 * mirror of the current local state — push the full snapshot after any change, pull it
 * once on sign-in. Simple to reason about and correct by construction; the trade-off is
 * more bytes over the wire than a diff-based sync, which is a non-issue at this data size.
 */

interface TableSync<T extends { id: string }> {
  table: string;
  toDb: (row: T, userId: string) => Record<string, unknown>;
  fromDb: (row: Record<string, unknown>) => T;
}

const subjectsSync: TableSync<Subject> = {
  table: "subjects",
  toDb: (s, userId) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    color_key: s.colorKey,
    max_sessions_per_day: s.maxSessionsPerDay,
    created_at: s.createdAt,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    name: r.name as string,
    colorKey: r.color_key as Subject["colorKey"],
    maxSessionsPerDay: (r.max_sessions_per_day as number | null) ?? 3,
    createdAt: r.created_at as string,
  }),
};

const chaptersSync: TableSync<Chapter> = {
  table: "chapters",
  toDb: (c, userId) => ({
    id: c.id,
    user_id: userId,
    subject_id: c.subjectId,
    name: c.name,
    mastery: c.mastery,
    difficulty: c.difficulty,
    last_reviewed_at: c.lastReviewedAt,
    sessions_count: c.sessionsCount,
    created_at: c.createdAt,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    name: r.name as string,
    mastery: r.mastery as number,
    difficulty: r.difficulty as Chapter["difficulty"],
    lastReviewedAt: (r.last_reviewed_at as string | null) ?? null,
    sessionsCount: r.sessions_count as number,
    createdAt: r.created_at as string,
  }),
};

const courseEventsSync: TableSync<CourseEvent> = {
  table: "schedule_events",
  toDb: (c, userId) => ({
    id: c.id,
    user_id: userId,
    subject_id: c.subjectId,
    title: c.title,
    day_of_week: c.dayOfWeek,
    start_time: c.startTime,
    end_time: c.endTime,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    title: r.title as string,
    dayOfWeek: r.day_of_week as number,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
  }),
};

const availabilitySync: TableSync<AvailabilityBlock> = {
  table: "availability",
  toDb: (a, userId) => ({ id: a.id, user_id: userId, day_of_week: a.dayOfWeek, start_time: a.startTime, end_time: a.endTime }),
  fromDb: (r) => ({
    id: r.id as string,
    dayOfWeek: r.day_of_week as number,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
  }),
};

const unavailableSync: TableSync<UnavailablePeriod> = {
  table: "unavailable_periods",
  toDb: (u, userId) => ({ id: u.id, user_id: userId, date: u.date, start_time: u.startTime, end_time: u.endTime, reason: u.reason ?? null }),
  fromDb: (r) => ({
    id: r.id as string,
    date: r.date as string,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
    reason: (r.reason as string | null) ?? undefined,
  }),
};

const examsSync: TableSync<Exam> = {
  table: "exams",
  toDb: (e, userId) => ({
    id: e.id,
    user_id: userId,
    subject_id: e.subjectId,
    name: e.name,
    date: e.date,
    duration: e.duration,
    chapter_ids: e.chapterIds,
    importance: e.importance,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    name: r.name as string,
    date: r.date as string,
    duration: r.duration as number,
    chapterIds: (r.chapter_ids as string[]) ?? [],
    importance: r.importance as Exam["importance"],
  }),
};

const oralExamsSync: TableSync<OralExam> = {
  table: "oral_exams",
  toDb: (o, userId) => ({
    id: o.id,
    user_id: userId,
    subject_id: o.subjectId,
    date: o.date,
    time: o.time ?? null,
    theme: o.theme,
    chapter_ids: o.chapterIds,
    importance: o.importance,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    date: r.date as string,
    time: r.time ? (r.time as string).slice(0, 5) : undefined,
    theme: r.theme as string,
    chapterIds: (r.chapter_ids as string[]) ?? [],
    importance: r.importance as OralExam["importance"],
  }),
};

const assignmentsSync: TableSync<Assignment> = {
  table: "assignments",
  toDb: (a, userId) => ({
    id: a.id,
    user_id: userId,
    subject_id: a.subjectId,
    title: a.title,
    due_date: a.dueDate,
    estimated_duration: a.estimatedDuration,
    importance: a.importance,
    done: a.done,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    title: r.title as string,
    dueDate: r.due_date as string,
    estimatedDuration: r.estimated_duration as number,
    importance: r.importance as Assignment["importance"],
    done: r.done as boolean,
  }),
};

const studySessionsSync: TableSync<StudySession> = {
  table: "study_sessions",
  toDb: (s, userId) => ({
    id: s.id,
    user_id: userId,
    subject_id: s.subjectId,
    chapter_id: s.chapterId,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    duration_minutes: s.durationMinutes,
    title: s.title,
    type: s.type,
    priority: s.priority,
    priority_score: s.priorityScore,
    status: s.status,
    reason: s.reason,
    source_type: s.sourceType,
    source_id: s.sourceId,
    actual_minutes: s.actualMinutes,
    auto: s.auto,
    created_at: s.createdAt,
  }),
  fromDb: (r) => ({
    id: r.id as string,
    subjectId: (r.subject_id as string | null) ?? null,
    chapterId: (r.chapter_id as string | null) ?? null,
    date: r.date as string,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
    durationMinutes: r.duration_minutes as number,
    title: r.title as string,
    type: r.type as StudySession["type"],
    priority: (r.priority as StudySession["priority"]) ?? null,
    priorityScore: Number(r.priority_score ?? 0),
    status: r.status as StudySession["status"],
    reason: (r.reason as string) ?? "",
    sourceType: (r.source_type as StudySession["sourceType"]) ?? null,
    sourceId: (r.source_id as string | null) ?? null,
    actualMinutes: r.actual_minutes as number,
    auto: r.auto as boolean,
    createdAt: r.created_at as string,
  }),
};

async function syncTable<T extends { id: string }>(supabase: SupabaseClient, userId: string, cfg: TableSync<T>, rows: T[]) {
  const { data: existing, error: readErr } = await supabase.from(cfg.table).select("id").eq("user_id", userId);
  if (readErr) throw readErr;
  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  const currentIds = new Set(rows.map((r) => r.id));

  const toDelete = [...existingIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase.from(cfg.table).delete().eq("user_id", userId).in("id", toDelete);
    if (error) throw error;
  }
  if (rows.length > 0) {
    const { error } = await supabase.from(cfg.table).upsert(rows.map((r) => cfg.toDb(r, userId)));
    if (error) throw error;
  }
}

/** Pushes the full local state up, mirroring it into Supabase for this user. */
export async function pushState(supabase: SupabaseClient, userId: string, state: AppState): Promise<void> {
  await syncTable(supabase, userId, subjectsSync, state.subjects);
  await syncTable(supabase, userId, chaptersSync, state.chapters);
  await syncTable(supabase, userId, courseEventsSync, state.courseEvents);
  await syncTable(supabase, userId, availabilitySync, state.availability);
  await syncTable(supabase, userId, unavailableSync, state.unavailablePeriods);
  await syncTable(supabase, userId, examsSync, state.exams);
  await syncTable(supabase, userId, oralExamsSync, state.oralExams);
  await syncTable(supabase, userId, assignmentsSync, state.assignments);
  await syncTable(supabase, userId, studySessionsSync, state.studySessions);
}

async function fetchTable<T extends { id: string }>(supabase: SupabaseClient, userId: string, cfg: TableSync<T>): Promise<T[]> {
  const { data, error } = await supabase.from(cfg.table).select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => cfg.fromDb(r as Record<string, unknown>));
}

/** Pulls this user's full state down from Supabase. Returns null on any read failure. */
export async function pullState(supabase: SupabaseClient, userId: string): Promise<AppState | null> {
  try {
    const [subjects, chapters, courseEvents, availability, unavailablePeriods, exams, oralExams, assignments, studySessions] =
      await Promise.all([
        fetchTable(supabase, userId, subjectsSync),
        fetchTable(supabase, userId, chaptersSync),
        fetchTable(supabase, userId, courseEventsSync),
        fetchTable(supabase, userId, availabilitySync),
        fetchTable(supabase, userId, unavailableSync),
        fetchTable(supabase, userId, examsSync),
        fetchTable(supabase, userId, oralExamsSync),
        fetchTable(supabase, userId, assignmentsSync),
        fetchTable(supabase, userId, studySessionsSync),
      ]);
    return { subjects, chapters, courseEvents, availability, unavailablePeriods, exams, oralExams, assignments, studySessions, lastGeneratedAt: null };
  } catch {
    return null;
  }
}
