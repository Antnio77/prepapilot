import type { SubjectColorKey } from "@/types";

export interface SubjectColorDef {
  label: string;
  /** CSS var name defined in globals.css */
  var: string;
}

export const SUBJECT_COLORS: Record<SubjectColorKey, SubjectColorDef> = {
  maths: { label: "Bleu", var: "--subject-maths" },
  physique: { label: "Violet", var: "--subject-physique" },
  chimie: { label: "Vert", var: "--subject-chimie" },
  si: { label: "Orange", var: "--subject-si" },
  francais: { label: "Rose", var: "--subject-francais" },
  anglais: { label: "Cyan", var: "--subject-anglais" },
  tipe: { label: "Jaune", var: "--subject-tipe" },
  autre: { label: "Gris", var: "--subject-autre" },
};

export function subjectColorVar(key: SubjectColorKey): string {
  return `var(${SUBJECT_COLORS[key]?.var ?? SUBJECT_COLORS.autre.var})`;
}

/**
 * The canonical subject list shipped with the app (used both to seed a fresh profile
 * and, in the store's persist `merge`, to backfill any of these a returning user's saved
 * profile doesn't have yet — e.g. Anglais/TIPE added after they'd already saved data).
 */
export const DEFAULT_SUBJECTS: { id: string; key: SubjectColorKey; name: string; dailyReview: boolean }[] = [
  { id: "subj-maths", key: "maths", name: "Maths", dailyReview: true },
  { id: "subj-physique", key: "physique", name: "Physique", dailyReview: true },
  { id: "subj-chimie", key: "chimie", name: "Chimie", dailyReview: false },
  { id: "subj-si", key: "si", name: "SI", dailyReview: true },
  { id: "subj-francais", key: "francais", name: "Français / Philosophie", dailyReview: false },
  { id: "subj-anglais", key: "anglais", name: "Anglais", dailyReview: false },
  { id: "subj-tipe", key: "tipe", name: "TIPE", dailyReview: false },
  { id: "subj-autre", key: "autre", name: "Autre", dailyReview: false },
];

export const DEFAULT_SUBJECT_KEYS: SubjectColorKey[] = DEFAULT_SUBJECTS.map((s) => s.key);

/**
 * Canonical `dailyReview` for a subject that has never had the field set — used to backfill
 * profiles saved (locally or in Supabase) before the field existed. Distinct from an explicit
 * `false`, which means the student deliberately turned the daily re-read off.
 */
export function defaultDailyReviewFor(colorKey: SubjectColorKey): boolean {
  return DEFAULT_SUBJECTS.find((s) => s.key === colorKey)?.dailyReview ?? false;
}
