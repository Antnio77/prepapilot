// Core domain types for PrépaPilot
// Dates are ISO strings "YYYY-MM-DD", times are "HH:mm" (24h), dayOfWeek 0=Lundi..6=Dimanche

export type SubjectColorKey =
  | "maths"
  | "physique"
  | "chimie"
  | "si"
  | "francais"
  | "anglais"
  | "tipe"
  | "autre";

export interface Subject {
  id: string;
  name: string;
  colorKey: SubjectColorKey;
  /** Max revision sessions the generator will place for this subject on a single day. Defaults to 3. */
  maxSessionsPerDay: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  /** 0-100 */
  mastery: number;
  /** 1-5 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  lastReviewedAt: string | null;
  sessionsCount: number;
  createdAt: string;
}

export interface CourseEvent {
  id: string;
  subjectId: string;
  title: string;
  dayOfWeek: number; // 0=Lundi .. 6=Dimanche
  startTime: string;
  endTime: string;
}

export interface AvailabilityBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UnavailablePeriod {
  id: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface Exam {
  id: string;
  name: string;
  subjectId: string;
  date: string; // ISO date
  duration: number; // minutes
  chapterIds: string[];
  importance: 1 | 2 | 3 | 4 | 5;
}

export interface OralExam {
  id: string;
  subjectId: string;
  date: string;
  time?: string;
  theme: string;
  chapterIds: string[];
  importance: 1 | 2 | 3 | 4 | 5;
}

export interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  estimatedDuration: number; // minutes
  importance: 1 | 2 | 3 | 4 | 5;
  done: boolean;
}

export type GradeKind = "ds" | "colle";

export interface Grade {
  id: string;
  subjectId: string;
  kind: GradeKind;
  /** Free-text label, e.g. "DS 3 — Intégrales" or "Colle n°2". */
  label: string;
  /** Out of 20, the standard French grading scale. */
  value: number;
  coefficient: number;
  date: string; // ISO date
  createdAt: string;
}

export type SessionType =
  | "cours"
  | "exercices"
  | "preparation_ds"
  | "preparation_colle"
  | "devoir"
  | "revision"
  | "pause";

export type SessionPriority = "haute" | "moyenne" | "basse";

export type SessionStatus = "a_faire" | "en_cours" | "termine" | "ignore";

export type SessionSourceType = "exam" | "oral" | "assignment" | "spaced";

export interface StudySession {
  id: string;
  subjectId: string | null; // null for pauses
  chapterId: string | null;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  durationMinutes: number;
  title: string;
  type: SessionType;
  priority: SessionPriority | null;
  priorityScore: number;
  status: SessionStatus;
  reason: string;
  sourceType: SessionSourceType | null;
  sourceId: string | null;
  actualMinutes: number;
  /** true when created by the scheduling algorithm (regenerated on "Générer mon planning") */
  auto: boolean;
  createdAt: string;
}

export interface AppState {
  subjects: Subject[];
  chapters: Chapter[];
  courseEvents: CourseEvent[];
  availability: AvailabilityBlock[];
  unavailablePeriods: UnavailablePeriod[];
  exams: Exam[];
  oralExams: OralExam[];
  assignments: Assignment[];
  studySessions: StudySession[];
  grades: Grade[];
  lastGeneratedAt: string | null;
}
