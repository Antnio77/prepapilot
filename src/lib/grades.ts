import type { Grade, GradeKind } from "@/types";

export const GRADE_KIND_LABEL: Record<GradeKind, string> = { ds: "DS", colle: "Colle" };

/** Coefficient-weighted average, out of 20. Null when there's nothing to average. */
export function weightedAverage(grades: Grade[]): number | null {
  const totalCoefficient = grades.reduce((sum, g) => sum + g.coefficient, 0);
  if (totalCoefficient <= 0) return null;
  const weighted = grades.reduce((sum, g) => sum + g.value * g.coefficient, 0);
  return weighted / totalCoefficient;
}

export function gradesForSubject(grades: Grade[], subjectId: string): Grade[] {
  return grades
    .filter((g) => g.subjectId === subjectId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** All grades sorted oldest → newest (ties broken by creation order), for trend charts. */
export function gradesChronological(grades: Grade[]): Grade[] {
  return [...grades].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export interface RunningAveragePoint {
  id: string;
  date: string;
  label: string;
  value: number;
  classAverage: number | null;
  runningAverage: number;
}

/**
 * For each grade in chronological order, the coefficient-weighted average of every grade up
 * to and including it — i.e. how the overall average moved as each new mark came in.
 */
export function runningAverageSeries(grades: Grade[]): RunningAveragePoint[] {
  const ordered = gradesChronological(grades);
  const seen: Grade[] = [];
  return ordered.map((g) => {
    seen.push(g);
    return {
      id: g.id,
      date: g.date,
      label: g.label,
      value: g.value,
      classAverage: g.kind === "ds" ? (g.classAverage ?? null) : null,
      runningAverage: weightedAverage(seen) ?? g.value,
    };
  });
}

export interface RankPoint {
  id: string;
  date: string;
  label: string;
  rank: number;
}

/** DS entries that have a rank filled in, oldest → newest. */
export function rankSeries(grades: Grade[]): RankPoint[] {
  return gradesChronological(grades)
    .filter((g): g is Grade & { rank: number } => g.kind === "ds" && g.rank != null)
    .map((g) => ({ id: g.id, date: g.date, label: g.label, rank: g.rank }));
}

export interface SubjectAverage {
  subjectId: string;
  name: string;
  average: number;
  count: number;
}

/** Weighted average per subject, subjects with no grades yet excluded. */
export function averagesBySubject(subjects: { id: string; name: string }[], grades: Grade[]): SubjectAverage[] {
  return subjects
    .map((s) => {
      const subjectGrades = grades.filter((g) => g.subjectId === s.id);
      const average = weightedAverage(subjectGrades);
      return { subjectId: s.id, name: s.name, average: average ?? 0, count: subjectGrades.length };
    })
    .filter((s) => s.count > 0);
}
