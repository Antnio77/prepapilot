import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** dayOfWeek: 0=Lundi .. 6=Dimanche */
export function dayOfWeekFromDate(date: Date): number {
  const jsDay = date.getDay(); // 0=Sunday..6=Saturday
  return (jsDay + 6) % 7;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = fromISODate(fromISO);
  const b = fromISODate(toISO);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const WEEKDAY_LABELS_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const WEEKDAY_LABELS_FR_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function weekdayLabel(dayOfWeek: number, short = false): string {
  return short ? WEEKDAY_LABELS_FR_SHORT[dayOfWeek] : WEEKDAY_LABELS_FR[dayOfWeek];
}

export function formatDateLong(iso: string): string {
  const d = fromISODate(iso);
  const dow = weekdayLabel(dayOfWeekFromDate(d));
  return `${dow} ${d.getDate()} ${MONTH_LABELS_FR[d.getMonth()]}`;
}

export function formatDateShort(iso: string): string {
  const d = fromISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeDayLabel(iso: string): string {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  if (diff > 1 && diff < 7) return `dans ${diff} jours`;
  if (diff < -1 && diff > -7) return `il y a ${-diff} jours`;
  return formatDateShort(iso);
}

export function relativePastLabel(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  return `il y a ${diff} jours`;
}

export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  const dow = dayOfWeekFromDate(d);
  return addDays(iso, -dow);
}

export function weekDates(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** ISO "YYYY-MM-DD" strings sort lexicographically like dates, so plain string compares work. */
export function clampISO(date: string, min: string, max: string): string {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
