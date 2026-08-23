"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, NotebookPen, Plus, Settings2 } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { addDays, dayOfWeekFromDate, formatDateShort, fromISODate, minutesToTime, startOfWeek, todayISO, weekDates, weekdayLabel } from "@/lib/utils";
import { subjectColorVar } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DayColumn } from "@/components/planning/DayColumn";
import { MobileDayView } from "@/components/planning/MobileDayView";
import { HOURS, PX_PER_HOUR } from "@/components/planning/gridMath";
import { SessionFormModal } from "@/components/planning/SessionFormModal";
import { CourseFormModal } from "@/components/planning/CourseFormModal";
import { ScheduleSettingsModal } from "@/components/planning/ScheduleSettingsModal";
import { GenerateButton } from "@/components/planning/GenerateButton";
import { usePlanningDrag } from "@/components/planning/usePlanningDrag";
import { isSlotAvailable, MIN_SESSION_MINUTES } from "@/lib/scheduling/generate";
import { useIsMobile } from "@/lib/useIsMobile";
import type { CourseEvent, StudySession } from "@/types";

export default function PlanningPage() {
  const state = useAppStore((s) => s);
  const subjects = state.subjects;
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [mobileDate, setMobileDate] = useState(() => todayISO());
  const [editSession, setEditSession] = useState<StudySession | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editCourse, setEditCourse] = useState<CourseEvent | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultDate, setDefaultDate] = useState(todayISO());
  const [defaultStartTime, setDefaultStartTime] = useState<string | undefined>(undefined);
  const [addChoice, setAddChoice] = useState<{ dateISO: string; minutes: number } | null>(null);

  const { ghost, registerColumn, startDrag, consumeSuppressed } = usePlanningDrag();

  const dates = weekDates(weekStart);

  function goToWeek(newWeekStart: string) {
    setWeekStart(newWeekStart);
    // Keep the mobile day selection on the same weekday within the new week.
    const offset = dayOfWeekFromDate(fromISODate(mobileDate));
    setMobileDate(addDays(newWeekStart, offset));
  }

  function goToToday() {
    setWeekStart(startOfWeek(todayISO()));
    setMobileDate(todayISO());
  }

  function openCreateSession(dateISO: string, startTime?: string) {
    setEditSession(null);
    setDefaultDate(dateISO);
    setDefaultStartTime(startTime);
    setShowSessionForm(true);
  }

  function openEditSession(session: StudySession) {
    setEditSession(session);
    setDefaultStartTime(undefined);
    setShowSessionForm(true);
  }

  function openCreateCourse(dateISO: string, minutes: number) {
    setEditCourse(null);
    setDefaultDate(dateISO);
    setDefaultStartTime(minutesToTime(minutes));
    setShowCourseForm(true);
  }

  function openEditCourse(course: CourseEvent) {
    setEditCourse(course);
    setShowCourseForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="text-sm text-muted mt-1">
            {formatDateShort(dates[0])} — {formatDateShort(dates[6])}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-border bg-surface">
            <button
              onClick={() => goToWeek(addDays(weekStart, -7))}
              className="h-9 w-9 flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="h-9 px-2.5 text-[13px] font-medium text-muted hover:text-foreground cursor-pointer">
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => goToWeek(addDays(weekStart, 7))}
              className="h-9 w-9 flex items-center justify-center text-muted hover:text-foreground cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 size={14} /> <span className="hidden sm:inline">Réglages</span>
          </Button>
          <GenerateButton />
          <Button size="sm" onClick={() => openCreateSession(todayISO())}>
            <Plus size={14} /> <span className="hidden sm:inline">Session</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-nowrap md:flex-wrap gap-x-4 gap-y-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1">
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted shrink-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: subjectColorVar(s.colorKey) }} />
              {s.name}
            </div>
          ))}
        </div>
        <p className="hidden md:block text-xs text-muted-foreground">
          Clique sur un créneau libre pour ajouter un cours ou une révision. Glisse un bloc pour le déplacer, sa bordure basse pour le redimensionner.
        </p>
      </div>

      {/* Desktop: full 7-day grid. Only one of these two views is ever mounted — both
          register DayColumn refs by date for drag/resize, so having both in the DOM at
          once (even CSS-hidden) would make the hidden one's zero-size rects win. */}
      {!isMobile && (
      <div className="rounded-2xl border border-border-soft bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border-soft sticky top-0 bg-surface z-10">
              <div />
              {dates.map((d) => {
                const isToday = d === todayISO();
                return (
                  <button
                    key={d}
                    onClick={() => openCreateSession(d)}
                    className="group flex flex-col items-center py-3 border-l border-border-soft hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] text-muted-foreground">{weekdayLabel((new Date(d).getDay() + 6) % 7, true)}</span>
                    <span
                      className={cn(
                        "text-sm font-semibold mt-0.5 h-6 w-6 flex items-center justify-center rounded-full",
                        isToday && "bg-accent text-accent-foreground"
                      )}
                    >
                      {Number(d.slice(-2))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-[48px_repeat(7,1fr)]">
              <div className="relative" style={{ height: (HOURS.length - 1) * PX_PER_HOUR }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute -translate-y-2 right-2 text-[10px] text-muted-foreground" style={{ top: (h - HOURS[0]) * PX_PER_HOUR }}>
                    {h}h
                  </div>
                ))}
              </div>
              {dates.map((d) => (
                <DayColumn
                  key={d}
                  dateISO={d}
                  onEditSession={openEditSession}
                  onEditCourse={openEditCourse}
                  onEmptyClick={(dateISO, minutes) => setAddChoice({ dateISO, minutes })}
                  registerColumn={registerColumn}
                  onBlockPointerDown={startDrag}
                  consumeSuppressed={consumeSuppressed}
                  dropPreview={ghost?.preview ?? null}
                  draggingId={ghost?.block.id ?? null}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Mobile: one day at a time. */}
      {isMobile && (
      <MobileDayView
        dates={dates}
        selectedDate={mobileDate}
        onSelectDate={setMobileDate}
        onEditSession={openEditSession}
        onEditCourse={openEditCourse}
        onEmptyClick={(dateISO, minutes) => setAddChoice({ dateISO, minutes })}
        registerColumn={registerColumn}
        onBlockPointerDown={startDrag}
        consumeSuppressed={consumeSuppressed}
        dropPreview={ghost?.preview ?? null}
        draggingId={ghost?.block.id ?? null}
      />
      )}

      {ghost && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg px-2.5 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-pop)]"
          style={{ left: ghost.clientX + 14, top: ghost.clientY + 14, background: ghost.preview.valid ? ghost.preview.color : "var(--danger)" }}
        >
          {ghost.preview.valid
            ? `${ghost.preview.title} · ${minutesToTime(ghost.preview.startMin)}–${minutesToTime(ghost.preview.endMin)}`
            : "Hors de tes disponibilités"}
        </div>
      )}

      <Modal open={addChoice !== null} onClose={() => setAddChoice(null)} title="Que veux-tu ajouter ?">
        {addChoice && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                openCreateCourse(addChoice.dateISO, addChoice.minutes);
                setAddChoice(null);
              }}
              className="flex flex-col items-center gap-2 rounded-xl border border-border-soft p-5 hover:bg-surface-hover hover:border-accent/40 transition-colors cursor-pointer"
            >
              <BookOpen size={20} className="text-accent" />
              <span className="text-sm font-medium">Un cours</span>
            </button>
            {isSlotAvailable(state, addChoice.dateISO, addChoice.minutes, addChoice.minutes + MIN_SESSION_MINUTES) ? (
              <button
                onClick={() => {
                  openCreateSession(addChoice.dateISO, minutesToTime(addChoice.minutes));
                  setAddChoice(null);
                }}
                className="flex flex-col items-center gap-2 rounded-xl border border-border-soft p-5 hover:bg-surface-hover hover:border-accent/40 transition-colors cursor-pointer"
              >
                <NotebookPen size={20} className="text-accent" />
                <span className="text-sm font-medium">Une révision</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-5 text-center opacity-50">
                <NotebookPen size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Une révision</span>
                <span className="text-[11px] text-muted-foreground">Hors de tes disponibilités</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <SessionFormModal
        key={`s-${editSession?.id ?? "new"}-${defaultDate}-${defaultStartTime ?? ""}`}
        open={showSessionForm}
        onClose={() => setShowSessionForm(false)}
        session={editSession}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
      />
      <CourseFormModal
        key={`c-${editCourse?.id ?? "new"}-${defaultDate}-${defaultStartTime ?? ""}`}
        open={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        course={editCourse}
        defaultDayOfWeek={(new Date(defaultDate).getDay() + 6) % 7}
        defaultStartTime={defaultStartTime}
      />
      <ScheduleSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
