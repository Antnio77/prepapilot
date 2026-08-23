"use client";

import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { cn, dayOfWeekFromDate, fromISODate, timeToMinutes, todayISO } from "@/lib/utils";
import type { CourseEvent, StudySession } from "@/types";
import type { DragBlock, DropPreview } from "./usePlanningDrag";
import { layoutOverlaps, type LayoutSlot } from "./collisionLayout";
import { GRID_HEIGHT, HOURS, PX_PER_HOUR, START_HOUR, heightForRange, topForTime } from "./gridMath";

function slotStyle(slot: LayoutSlot | undefined, gutterPx: number): { left: string; width: string } {
  const cols = slot?.cols ?? 1;
  const col = slot?.col ?? 0;
  return {
    left: `calc(${(col / cols) * 100}% + ${gutterPx}px)`,
    width: `calc(${100 / cols}% - ${gutterPx * 2}px)`,
  };
}

export function DayColumn({
  dateISO,
  onEditSession,
  onEditCourse,
  onEmptyClick,
  registerColumn,
  onBlockPointerDown,
  consumeSuppressed,
  dropPreview,
  draggingId,
}: {
  dateISO: string;
  onEditSession: (session: StudySession) => void;
  onEditCourse: (course: CourseEvent) => void;
  onEmptyClick: (dateISO: string, minutes: number) => void;
  registerColumn: (dateISO: string, el: HTMLDivElement | null) => void;
  onBlockPointerDown: (e: React.PointerEvent, block: DragBlock, mode: "move" | "resize") => void;
  consumeSuppressed: () => boolean;
  dropPreview: DropPreview | null;
  draggingId: string | null;
}) {
  const dow = dayOfWeekFromDate(fromISODate(dateISO));
  const subjects = useAppStore((s) => s.subjects);
  // Select the raw (stable) arrays and filter in render — filtering inside the
  // zustand selector would return a new array on every call and loop React.
  const allCourseEvents = useAppStore((s) => s.courseEvents);
  const allAvailability = useAppStore((s) => s.availability);
  const allSessions = useAppStore((s) => s.studySessions);
  const allExams = useAppStore((s) => s.exams);
  const allOralExams = useAppStore((s) => s.oralExams);

  const courseEvents = allCourseEvents.filter((c) => c.dayOfWeek === dow);
  const availability = allAvailability.filter((a) => a.dayOfWeek === dow);
  const sessions = allSessions.filter((sess) => sess.date === dateISO);
  const exams = allExams.filter((e) => e.date === dateISO);
  const oralExams = allOralExams.filter((o) => o.date === dateISO);
  const isToday = dateISO === todayISO();

  // Courses and (non-pause) sessions share one collision layout so two things at the same
  // hour split into side-by-side columns instead of silently stacking on top of each other.
  const workSessions = sessions.filter((s) => s.type !== "pause");
  const layout = layoutOverlaps([
    ...courseEvents.map((c) => ({ id: `course-${c.id}`, startMin: timeToMinutes(c.startTime), endMin: timeToMinutes(c.endTime) })),
    ...workSessions.map((s) => ({ id: `session-${s.id}`, startMin: timeToMinutes(s.startTime), endMin: timeToMinutes(s.endTime) })),
  ]);

  const colorFor = (subjectId: string | null) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? subjectColorVar(subject.colorKey) : "var(--muted)";
  };

  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (consumeSuppressed()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawMinutes = START_HOUR * 60 + ((e.clientY - rect.top) / PX_PER_HOUR) * 60;
    const snapped = Math.round(rawMinutes / 15) * 15;
    onEmptyClick(dateISO, snapped);
  }

  return (
    <div
      ref={(el) => registerColumn(dateISO, el)}
      onClick={handleBackgroundClick}
      className={cn("relative border-l border-border-soft cursor-pointer", isToday && "bg-accent-soft/30")}
      style={{ height: GRID_HEIGHT }}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-border-soft"
          style={{ top: (h - HOURS[0]) * PX_PER_HOUR }}
        />
      ))}

      {availability.map((a) => (
        <div
          key={a.id}
          className="absolute inset-x-0.5 rounded-md bg-success-soft/50 pointer-events-none"
          style={{ top: topForTime(a.startTime), height: heightForRange(a.startTime, a.endTime) }}
        />
      ))}

      {courseEvents.map((c) => (
        <div
          key={c.id}
          onPointerDown={(e) => onBlockPointerDown(e, { kind: "course", id: c.id, dateISO, startTime: c.startTime, endTime: c.endTime, title: c.title, color: colorFor(c.subjectId) }, "move")}
          onClick={(e) => {
            e.stopPropagation();
            if (consumeSuppressed()) return;
            onEditCourse(c);
          }}
          className={cn(
            "group absolute rounded-md bg-surface-hover border-l-2 px-1.5 py-0.5 cursor-grab active:cursor-grabbing hover:brightness-95 hover:z-10 transition touch-none select-none",
            draggingId === c.id && "opacity-30"
          )}
          style={{ top: topForTime(c.startTime), height: heightForRange(c.startTime, c.endTime), borderColor: colorFor(c.subjectId), ...slotStyle(layout.get(`course-${c.id}`), 2) }}
        >
          <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">{c.title}</p>
          <div
            onPointerDown={(e) => onBlockPointerDown(e, { kind: "course", id: c.id, dateISO, startTime: c.startTime, endTime: c.endTime, title: c.title, color: colorFor(c.subjectId) }, "resize")}
            className="absolute inset-x-0 -bottom-1 h-3 cursor-ns-resize flex items-end justify-center pb-0.5 touch-none"
          >
            <span className="w-6 h-1 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      ))}

      {exams.map((e) => (
        <div
          key={e.id}
          className="absolute inset-x-0.5 rounded-md px-1.5 py-1 overflow-hidden border-2 border-dashed pointer-events-none"
          style={{ top: topForTime("08:00"), height: heightForRange("08:00", "09:30"), borderColor: colorFor(e.subjectId), background: "var(--danger-soft)" }}
        >
          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: "var(--danger)" }}>
            DS · {e.name}
          </p>
        </div>
      ))}

      {oralExams.map((o) => (
        <div
          key={o.id}
          className="absolute inset-x-0.5 rounded-md px-1.5 py-1 overflow-hidden border-2 border-dashed pointer-events-none"
          style={{
            top: topForTime(o.time ?? "14:00"),
            height: heightForRange(o.time ?? "14:00", addMinutesToTime(o.time ?? "14:00", 60)),
            borderColor: colorFor(o.subjectId),
            background: "var(--warning-soft)",
          }}
        >
          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: "var(--warning)" }}>
            Colle · {o.theme}
          </p>
        </div>
      ))}

      {sessions.map((s) => {
        const color = colorFor(s.subjectId);
        if (s.type === "pause") {
          return (
            <div
              key={s.id}
              className="absolute inset-x-1 rounded-md border border-dashed border-border flex items-center justify-center pointer-events-none"
              style={{ top: topForTime(s.startTime), height: heightForRange(s.startTime, s.endTime) }}
            >
              <span className="text-[9px] text-muted-foreground">pause</span>
            </div>
          );
        }
        return (
          <div
            key={s.id}
            onPointerDown={(e) => onBlockPointerDown(e, { kind: "session", id: s.id, dateISO, startTime: s.startTime, endTime: s.endTime, title: s.title, color }, "move")}
            onClick={(e) => {
              e.stopPropagation();
              if (consumeSuppressed()) return;
              onEditSession(s);
            }}
            className={cn(
              "group absolute rounded-md px-1.5 py-1 text-left border-l-2 transition-transform hover:scale-[1.02] hover:z-10 cursor-grab active:cursor-grabbing touch-none select-none",
              s.status === "termine" && "opacity-50",
              s.status === "ignore" && "opacity-40",
              draggingId === s.id && "opacity-30"
            )}
            style={{
              top: topForTime(s.startTime),
              height: heightForRange(s.startTime, s.endTime),
              borderColor: color,
              background: "var(--surface)",
              boxShadow: "var(--shadow-card)",
              ...slotStyle(layout.get(`session-${s.id}`), 4),
            }}
          >
            <p className="text-[10px] font-semibold truncate leading-tight" style={{ color }}>
              {s.title}
            </p>
            <p className="text-[9px] text-muted-foreground truncate leading-tight">
              {s.startTime}–{s.endTime}
            </p>
            <div
              onPointerDown={(e) => onBlockPointerDown(e, { kind: "session", id: s.id, dateISO, startTime: s.startTime, endTime: s.endTime, title: s.title, color }, "resize")}
              className="absolute inset-x-0 -bottom-1 h-3 cursor-ns-resize flex items-end justify-center pb-0.5 touch-none"
            >
              <span className="w-6 h-1 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        );
      })}

      {dropPreview && dropPreview.dateISO === dateISO && (
        <div
          className="absolute inset-x-0.5 rounded-md border-2 border-dashed pointer-events-none z-20 flex items-center px-1.5"
          style={{
            top: (dropPreview.startMin - START_HOUR * 60) / 60 * PX_PER_HOUR,
            height: Math.max(16, ((dropPreview.endMin - dropPreview.startMin) / 60) * PX_PER_HOUR),
            borderColor: dropPreview.valid ? dropPreview.color : "var(--danger)",
            background: dropPreview.valid ? "var(--surface)" : "var(--danger-soft)",
          }}
        >
          <p className="text-[10px] font-semibold truncate" style={{ color: dropPreview.valid ? dropPreview.color : "var(--danger)" }}>
            {dropPreview.valid ? dropPreview.title : "Hors disponibilités"}
          </p>
        </div>
      )}
    </div>
  );
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
