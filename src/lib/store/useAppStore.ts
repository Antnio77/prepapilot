"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  Assignment,
  AvailabilityBlock,
  Chapter,
  CourseEvent,
  Exam,
  OralExam,
  SessionStatus,
  StudySession,
  Subject,
  UnavailablePeriod,
} from "@/types";
import { buildDemoData } from "@/lib/demoData";
import { DEFAULT_SUBJECTS } from "@/lib/subjects";
import { generateSchedule, rescheduleSession } from "@/lib/scheduling/generate";
import { uid, todayISO, clamp } from "@/lib/utils";

/** Adds any canonical subject (e.g. Anglais/TIPE) a returning user's saved profile predates. */
function backfillDefaultSubjects(subjects: Subject[]): Subject[] {
  const existingKeys = new Set(subjects.map((s) => s.colorKey));
  const missing = DEFAULT_SUBJECTS.filter((s) => !existingKeys.has(s.key));
  if (missing.length === 0) return subjects;
  const now = new Date().toISOString();
  return [...subjects, ...missing.map((s) => ({ id: s.id, name: s.name, colorKey: s.key, createdAt: now }))];
}

interface Store extends AppState {
  hydrated: boolean;
  activeSessionId: string | null;
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;
  preferredTimerMode: "simple" | "pomodoro";
  setPreferredTimerMode: (mode: "simple" | "pomodoro") => void;

  // subjects
  addSubject: (s: Omit<Subject, "id" | "createdAt">) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // chapters
  addChapter: (c: Omit<Chapter, "id" | "createdAt" | "sessionsCount">) => void;
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;

  // course events
  addCourseEvent: (c: Omit<CourseEvent, "id">) => void;
  updateCourseEvent: (id: string, patch: Partial<CourseEvent>) => void;
  deleteCourseEvent: (id: string) => void;

  // availability
  addAvailability: (a: Omit<AvailabilityBlock, "id">) => void;
  updateAvailability: (id: string, patch: Partial<AvailabilityBlock>) => void;
  deleteAvailability: (id: string) => void;
  addUnavailablePeriod: (u: Omit<UnavailablePeriod, "id">) => void;
  deleteUnavailablePeriod: (id: string) => void;

  // deadlines
  addExam: (e: Omit<Exam, "id">) => void;
  updateExam: (id: string, patch: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  addOralExam: (o: Omit<OralExam, "id">) => void;
  updateOralExam: (id: string, patch: Partial<OralExam>) => void;
  deleteOralExam: (id: string) => void;
  addAssignment: (a: Omit<Assignment, "id" | "done">) => void;
  updateAssignment: (id: string, patch: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  toggleAssignmentDone: (id: string) => void;

  // study sessions
  addStudySession: (s: Omit<StudySession, "id" | "createdAt" | "actualMinutes" | "auto" | "status" | "priorityScore"> & Partial<Pick<StudySession, "status" | "priorityScore">>) => void;
  updateStudySession: (id: string, patch: Partial<StudySession>) => void;
  deleteStudySession: (id: string, opts?: { reschedule?: boolean }) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;
  startSession: (id: string) => void;
  completeSession: (id: string, actualMinutes: number) => void;

  runGeneration: () => void;
  resetDemoData: () => void;
}

const emptyState = (): AppState => ({
  subjects: [],
  chapters: [],
  courseEvents: [],
  availability: [],
  unavailablePeriods: [],
  exams: [],
  oralExams: [],
  assignments: [],
  studySessions: [],
  lastGeneratedAt: null,
});

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...emptyState(),
      hydrated: false,
      activeSessionId: null,
      remindersEnabled: false,
      setRemindersEnabled: (enabled) => set({ remindersEnabled: enabled }),
      preferredTimerMode: "pomodoro",
      setPreferredTimerMode: (mode) => set({ preferredTimerMode: mode }),

      addSubject: (s) =>
        set((state) => ({ subjects: [...state.subjects, { ...s, id: uid(), createdAt: new Date().toISOString() }] })),
      updateSubject: (id, patch) =>
        set((state) => ({ subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      deleteSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          chapters: state.chapters.filter((c) => c.subjectId !== id),
        })),

      addChapter: (c) =>
        set((state) => ({
          chapters: [...state.chapters, { ...c, id: uid(), sessionsCount: 0, createdAt: new Date().toISOString() }],
        })),
      updateChapter: (id, patch) =>
        set((state) => ({ chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteChapter: (id) => set((state) => ({ chapters: state.chapters.filter((c) => c.id !== id) })),

      addCourseEvent: (c) => set((state) => ({ courseEvents: [...state.courseEvents, { ...c, id: uid() }] })),
      updateCourseEvent: (id, patch) =>
        set((state) => ({ courseEvents: state.courseEvents.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCourseEvent: (id) => set((state) => ({ courseEvents: state.courseEvents.filter((c) => c.id !== id) })),

      addAvailability: (a) => set((state) => ({ availability: [...state.availability, { ...a, id: uid() }] })),
      updateAvailability: (id, patch) =>
        set((state) => ({ availability: state.availability.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAvailability: (id) => set((state) => ({ availability: state.availability.filter((a) => a.id !== id) })),
      addUnavailablePeriod: (u) =>
        set((state) => ({ unavailablePeriods: [...state.unavailablePeriods, { ...u, id: uid() }] })),
      deleteUnavailablePeriod: (id) =>
        set((state) => ({ unavailablePeriods: state.unavailablePeriods.filter((u) => u.id !== id) })),

      addExam: (e) => set((state) => ({ exams: [...state.exams, { ...e, id: uid() }] })),
      updateExam: (id, patch) => set((state) => ({ exams: state.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteExam: (id) => set((state) => ({ exams: state.exams.filter((e) => e.id !== id) })),

      addOralExam: (o) => set((state) => ({ oralExams: [...state.oralExams, { ...o, id: uid() }] })),
      updateOralExam: (id, patch) =>
        set((state) => ({ oralExams: state.oralExams.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      deleteOralExam: (id) => set((state) => ({ oralExams: state.oralExams.filter((o) => o.id !== id) })),

      addAssignment: (a) =>
        set((state) => ({ assignments: [...state.assignments, { ...a, id: uid(), done: false }] })),
      updateAssignment: (id, patch) =>
        set((state) => ({ assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAssignment: (id) => set((state) => ({ assignments: state.assignments.filter((a) => a.id !== id) })),
      toggleAssignmentDone: (id) =>
        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
        })),

      addStudySession: (s) =>
        set((state) => ({
          studySessions: [
            ...state.studySessions,
            {
              ...s,
              id: uid(),
              status: s.status ?? "a_faire",
              priorityScore: s.priorityScore ?? 0,
              actualMinutes: 0,
              auto: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateStudySession: (id, patch) =>
        set((state) => ({
          studySessions: state.studySessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      deleteStudySession: (id, opts) =>
        set((state) => {
          const target = state.studySessions.find((s) => s.id === id);
          const rest = state.studySessions.filter((s) => s.id !== id);
          const shouldReschedule = (opts?.reschedule ?? true) && target && target.type !== "pause" && target.status !== "termine";
          if (!shouldReschedule || !target) return { studySessions: rest };
          const rescheduled = rescheduleSession({ ...state, studySessions: rest }, target);
          return { studySessions: rescheduled ? [...rest, rescheduled] : rest };
        }),
      setSessionStatus: (id, status) =>
        set((state) => {
          const target = state.studySessions.find((s) => s.id === id);
          if (!target) return {};
          const updated = state.studySessions.map((s) => (s.id === id ? { ...s, status } : s));
          if (status !== "ignore" || target.type === "pause") return { studySessions: updated };
          const rescheduled = rescheduleSession({ ...state, studySessions: updated }, { ...target, status: "a_faire" });
          return { studySessions: rescheduled ? [...updated, rescheduled] : updated };
        }),
      startSession: (id) =>
        set((state) => ({
          activeSessionId: id,
          studySessions: state.studySessions.map((s) => (s.id === id ? { ...s, status: "en_cours" } : s)),
        })),
      completeSession: (id, actualMinutes) =>
        set((state) => {
          const target = state.studySessions.find((s) => s.id === id);
          const studySessions = state.studySessions.map((s) =>
            s.id === id ? { ...s, status: "termine" as SessionStatus, actualMinutes } : s
          );
          let chapters = state.chapters;
          if (target?.chapterId) {
            chapters = state.chapters.map((c) => {
              if (c.id !== target.chapterId) return c;
              const gain = clamp(Math.round(9 - c.difficulty), 2, 8);
              return {
                ...c,
                mastery: clamp(c.mastery + gain, 0, 100),
                lastReviewedAt: todayISO(),
                sessionsCount: c.sessionsCount + 1,
              };
            });
          }
          return {
            studySessions,
            chapters,
            activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
          };
        }),

      runGeneration: () =>
        set((state) => {
          const from = todayISO();
          const kept = state.studySessions.filter((s) => !(s.auto && s.status === "a_faire" && s.date >= from));
          const fresh = generateSchedule({ ...state, studySessions: kept });
          return { studySessions: [...kept, ...fresh], lastGeneratedAt: new Date().toISOString() };
        }),

      resetDemoData: () => set({ ...buildDemoData(), activeSessionId: null }),
    }),
    {
      name: "prepapilot-store-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : (undefined as never))),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (state) => {
        const rest: Partial<Store> = { ...state };
        delete rest.hydrated;
        delete rest.activeSessionId;
        return rest;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Store>) };
        if (!merged.subjects || merged.subjects.length === 0) {
          return { ...merged, ...buildDemoData() };
        }
        return { ...merged, subjects: backfillDefaultSubjects(merged.subjects) };
      },
    }
  )
);
