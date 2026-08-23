"use client";

import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { isSlotAvailable } from "@/lib/scheduling/generate";
import { dayOfWeekFromDate, fromISODate, minutesToTime, timeToMinutes } from "@/lib/utils";
import { END_HOUR, PX_PER_HOUR, START_HOUR } from "./gridMath";

const SNAP_MINUTES = 15;
const MIN_DURATION = 15;
const DRAG_THRESHOLD_PX = 6;

export interface DragBlock {
  kind: "session" | "course";
  id: string;
  /** The specific calendar date this block currently occupies (for a course, the date of
   *  the column it's rendered in this week — used only to locate its column on-screen). */
  dateISO: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
}

export interface DropPreview {
  dateISO: string;
  startMin: number;
  endMin: number;
  title: string;
  color: string;
  /** Sessions may only land within declared availability; courses (the fixed timetable)
   *  aren't restricted this way, so they're always valid. */
  valid: boolean;
}

/**
 * Click-and-drag rescheduling for the week grid: drag a block's body to move it (to a new
 * time and/or day), or its bottom edge to resize it. Built on Pointer Events rather than
 * separate mouse/touch handlers, so the exact same code drives it with a mouse, a finger, or
 * a stylus — resize needs continuous pixel feedback that the native HTML5 DnD API doesn't
 * give, so both move and resize share this one plain-event-tracking mechanism.
 */
export function usePlanningDrag() {
  const updateStudySession = useAppStore((s) => s.updateStudySession);
  const updateCourseEvent = useAppStore((s) => s.updateCourseEvent);

  const [ghost, setGhost] = useState<{
    block: DragBlock;
    mode: "move" | "resize";
    clientX: number;
    clientY: number;
    preview: DropPreview;
  } | null>(null);

  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerColumn = useCallback((dateISO: string, el: HTMLDivElement | null) => {
    if (el) columnRefs.current.set(dateISO, el);
    else columnRefs.current.delete(dateISO);
  }, []);

  const suppressClickRef = useRef(false);
  const consumeSuppressed = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  const stateRef = useRef<{
    pointerId: number;
    block: DragBlock;
    mode: "move" | "resize";
    startClientX: number;
    startClientY: number;
    origStartMin: number;
    origEndMin: number;
    pointerOffsetMin: number;
    dragging: boolean;
  } | null>(null);
  // Mirrors the latest preview so handlePointerUp can commit it as a plain side effect —
  // reading it from a setState updater (setGhost(g => { commit(...); ... })) would call a
  // zustand `set()` synchronously inside React's updater function, which React (rightly)
  // flags as "updating a component while rendering a different component".
  const latestPreviewRef = useRef<DropPreview | null>(null);

  function minutesFromClientY(rect: DOMRect, clientY: number): number {
    const offsetY = clientY - rect.top;
    const raw = START_HOUR * 60 + (offsetY / PX_PER_HOUR) * 60;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(END_HOUR * 60, Math.max(START_HOUR * 60, snapped));
  }

  function columnAtClientX(clientX: number): string | null {
    for (const [dateISO, el] of columnRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX < r.right) return dateISO;
    }
    return null;
  }

  const commit = useCallback(
    (block: DragBlock, preview: DropPreview) => {
      const startTime = minutesToTime(preview.startMin);
      const endTime = minutesToTime(preview.endMin);
      if (block.kind === "session") {
        updateStudySession(block.id, {
          date: preview.dateISO,
          startTime,
          endTime,
          durationMinutes: preview.endMin - preview.startMin,
        });
      } else {
        const dow = dayOfWeekFromDate(fromISODate(preview.dateISO));
        updateCourseEvent(block.id, { dayOfWeek: dow, startTime, endTime });
      }
    },
    [updateStudySession, updateCourseEvent]
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const st = stateRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    if (!st.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!st.dragging) e.preventDefault(); // first frame past the threshold: cancel page scroll
    st.dragging = true;
    e.preventDefault();

    if (st.mode === "resize") {
      const colEl = columnRefs.current.get(st.block.dateISO);
      if (!colEl) return;
      const rect = colEl.getBoundingClientRect();
      const newEnd = Math.max(st.origStartMin + MIN_DURATION, minutesFromClientY(rect, e.clientY));
      const valid = st.block.kind === "course" || isSlotAvailable(useAppStore.getState(), st.block.dateISO, st.origStartMin, newEnd, st.block.id);
      const preview: DropPreview = { dateISO: st.block.dateISO, startMin: st.origStartMin, endMin: newEnd, title: st.block.title, color: st.block.color, valid };
      latestPreviewRef.current = preview;
      setGhost({ block: st.block, mode: "resize", clientX: e.clientX, clientY: e.clientY, preview });
      return;
    }

    const targetDate = columnAtClientX(e.clientX) ?? st.block.dateISO;
    const colEl = columnRefs.current.get(targetDate);
    if (!colEl) return;
    const rect = colEl.getBoundingClientRect();
    const duration = st.origEndMin - st.origStartMin;
    const cursorMin = minutesFromClientY(rect, e.clientY);
    let newStart = Math.round((cursorMin - st.pointerOffsetMin) / SNAP_MINUTES) * SNAP_MINUTES;
    newStart = Math.min(END_HOUR * 60 - duration, Math.max(START_HOUR * 60, newStart));
    const valid = st.block.kind === "course" || isSlotAvailable(useAppStore.getState(), targetDate, newStart, newStart + duration, st.block.id);
    const preview: DropPreview = { dateISO: targetDate, startMin: newStart, endMin: newStart + duration, title: st.block.title, color: st.block.color, valid };
    latestPreviewRef.current = preview;
    setGhost({ block: st.block, mode: "move", clientX: e.clientX, clientY: e.clientY, preview });
  }, []);

  // Only handles the "commit" logic — attaching/detaching the window listeners happens in
  // startDrag's own local `onUp` closure below, so this never needs to reference itself.
  const handlePointerUp = useCallback(() => {
    const st = stateRef.current;
    const preview = latestPreviewRef.current;
    stateRef.current = null;
    latestPreviewRef.current = null;
    if (st?.dragging && preview) {
      suppressClickRef.current = true;
      // An invalid drop (a session moved/resized outside declared availability) is simply
      // discarded — the block snaps back to where it was, no partial or out-of-bounds update.
      if (preview.valid) commit(st.block, preview);
    }
    setGhost(null);
  }, [commit]);

  const startDrag = useCallback(
    (e: React.PointerEvent, block: DragBlock, mode: "move" | "resize") => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const startMin = timeToMinutes(block.startTime);
      const endMin = timeToMinutes(block.endTime);
      const colEl = columnRefs.current.get(block.dateISO);
      const rect = colEl?.getBoundingClientRect();
      const pointerMin = rect ? minutesFromClientY(rect, e.clientY) : startMin;
      stateRef.current = {
        pointerId: e.pointerId,
        block,
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origStartMin: startMin,
        origEndMin: endMin,
        pointerOffsetMin: pointerMin - startMin,
        dragging: false,
      };
      const onMove = (ev: PointerEvent) => handlePointerMove(ev);
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== stateRef.current?.pointerId && stateRef.current !== null) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        handlePointerUp();
      };
      // Non-passive: dragging must be able to call preventDefault to stop the page from
      // scrolling once a touch gesture is recognized as a drag rather than a scroll.
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [handlePointerMove, handlePointerUp]
  );

  return { ghost, registerColumn, startDrag, consumeSuppressed };
}
