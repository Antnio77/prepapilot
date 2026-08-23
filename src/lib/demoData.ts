import type { Subject } from "@/types";
import { DEFAULT_SUBJECTS } from "@/lib/subjects";

/**
 * Starting state for a brand-new profile: the canonical subject list (see DEFAULT_SUBJECTS)
 * with everything else empty. No invented chapters, timetable, availability, or deadlines —
 * the student fills those in themselves from the Matières / Planning / Échéances pages.
 */
export function buildDemoData() {
  const now = new Date().toISOString();
  const subjects: Subject[] = DEFAULT_SUBJECTS.map((s) => ({ id: s.id, name: s.name, colorKey: s.key, createdAt: now }));

  return {
    subjects,
    chapters: [],
    courseEvents: [],
    availability: [],
    unavailablePeriods: [],
    exams: [],
    oralExams: [],
    assignments: [],
    studySessions: [],
    lastGeneratedAt: null as string | null,
  };
}
