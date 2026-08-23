"use client";

import { cn, dayOfWeekFromDate, fromISODate, todayISO, weekdayLabel } from "@/lib/utils";
import { DayColumn } from "./DayColumn";
import { GRID_HEIGHT, HOURS, PX_PER_HOUR } from "./gridMath";
import type { CourseEvent, StudySession } from "@/types";
import type { DragBlock, DropPreview } from "./usePlanningDrag";

/**
 * One day at a time instead of the desktop's 7-column grid: on a phone width, seven
 * columns squeeze into unreadable slivers and horizontal scrolling to see them is
 * miserable. A day-picker strip + a single full-width column reuses the same DayColumn
 * (so every interaction — tap, drag, resize — behaves identically), just laid out for
 * one thumb. Cross-day drag isn't available here since only one column exists to drop
 * onto — editing a session's date field is the mobile equivalent for that.
 */
export function MobileDayView({
  dates,
  selectedDate,
  onSelectDate,
  onEditSession,
  onEditCourse,
  onEmptyClick,
  registerColumn,
  onBlockPointerDown,
  consumeSuppressed,
  dropPreview,
  draggingId,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  onEditSession: (session: StudySession) => void;
  onEditCourse: (course: CourseEvent) => void;
  onEmptyClick: (dateISO: string, minutes: number) => void;
  registerColumn: (dateISO: string, el: HTMLDivElement | null) => void;
  onBlockPointerDown: (e: React.PointerEvent, block: DragBlock, mode: "move" | "resize") => void;
  consumeSuppressed: () => boolean;
  dropPreview: DropPreview | null;
  draggingId: string | null;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((d) => {
          const isSelected = d === selectedDate;
          const isToday = d === todayISO();
          const dow = dayOfWeekFromDate(fromISODate(d));
          return (
            <button
              key={d}
              onClick={() => onSelectDate(d)}
              className={cn(
                "flex flex-col items-center py-2 rounded-xl border transition-colors cursor-pointer",
                isSelected
                  ? "bg-accent border-accent text-accent-foreground"
                  : "bg-surface border-border-soft text-foreground hover:bg-surface-hover"
              )}
            >
              <span className={cn("text-[10px]", isSelected ? "text-accent-foreground/80" : "text-muted-foreground")}>
                {weekdayLabel(dow, true)}
              </span>
              <span className="text-sm font-semibold mt-0.5 tabular-nums">{Number(d.slice(-2))}</span>
              {isToday && (
                <span className={cn("h-1 w-1 rounded-full mt-0.5", isSelected ? "bg-accent-foreground" : "bg-accent")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border-soft bg-surface overflow-hidden mt-3">
        <div className="flex">
          <div className="relative w-9 shrink-0" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute -translate-y-2 right-1.5 text-[10px] text-muted-foreground"
                style={{ top: (h - HOURS[0]) * PX_PER_HOUR }}
              >
                {h}h
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <DayColumn
              dateISO={selectedDate}
              onEditSession={onEditSession}
              onEditCourse={onEditCourse}
              onEmptyClick={onEmptyClick}
              registerColumn={registerColumn}
              onBlockPointerDown={onBlockPointerDown}
              consumeSuppressed={consumeSuppressed}
              dropPreview={dropPreview}
              draggingId={draggingId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
