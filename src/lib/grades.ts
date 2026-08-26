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
