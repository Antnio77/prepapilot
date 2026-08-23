"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import type { DeadlineItem } from "@/lib/selectors";
import { subjectColorVar } from "@/lib/subjects";
import { cn, fromISODate, toISODate, todayISO } from "@/lib/utils";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function MiniCalendar({ items, onSelectDate }: { items: DeadlineItem[]; onSelectDate?: (date: string) => void }) {
  const subjects = useAppStore((s) => s.subjects);
  const [cursor, setCursor] = useState(() => {
    const t = fromISODate(todayISO());
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1))),
  ];

  const itemsByDate = new Map<string, DeadlineItem[]>();
  for (const item of items) {
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold capitalize">
          {MONTHS_FR[month]} {year}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:bg-surface-hover cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:bg-surface-hover cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dayItems = itemsByDate.get(date) ?? [];
          const isToday = date === todayISO();
          return (
            <button
              key={date}
              onClick={() => onSelectDate?.(date)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative gap-0.5 hover:bg-surface-hover transition-colors cursor-pointer",
                isToday && "bg-accent-soft font-semibold text-accent"
              )}
            >
              {Number(date.slice(-2))}
              <div className="flex gap-0.5">
                {dayItems.slice(0, 3).map((item, idx) => {
                  const subject = subjects.find((s) => s.id === item.subjectId);
                  return (
                    <span
                      key={idx}
                      className="h-1 w-1 rounded-full"
                      style={{ background: subject ? subjectColorVar(subject.colorKey) : "var(--muted)" }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
