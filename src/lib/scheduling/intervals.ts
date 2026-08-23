/** Minute-of-day interval helpers used to compute free slots. */

export interface Interval {
  start: number; // minutes since midnight
  end: number;
}

export function subtractIntervals(base: Interval[], busy: Interval[]): Interval[] {
  let result = base.map((b) => ({ ...b }));
  for (const b of busy) {
    const next: Interval[] = [];
    for (const r of result) {
      if (b.end <= r.start || b.start >= r.end) {
        next.push(r);
        continue;
      }
      if (b.start > r.start) next.push({ start: r.start, end: Math.min(b.start, r.end) });
      if (b.end < r.end) next.push({ start: Math.max(b.end, r.start), end: r.end });
    }
    result = next.filter((r) => r.end - r.start > 0);
  }
  return result.sort((a, b) => a.start - b.start);
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function intervalDuration(i: Interval): number {
  return Math.max(0, i.end - i.start);
}
