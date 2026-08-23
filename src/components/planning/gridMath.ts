import { timeToMinutes } from "@/lib/utils";

export const START_HOUR = 7;
export const END_HOUR = 23;
export const PX_PER_HOUR = 56;
export const GRID_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;
export const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function topForTime(time: string): number {
  const mins = timeToMinutes(time) - START_HOUR * 60;
  return (mins / 60) * PX_PER_HOUR;
}

export function heightForRange(start: string, end: string): number {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  return Math.max(16, (mins / 60) * PX_PER_HOUR);
}
