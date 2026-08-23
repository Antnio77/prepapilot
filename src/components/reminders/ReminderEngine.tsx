"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { getUpcomingDeadlines } from "@/lib/selectors";
import { timeToMinutes, todayISO } from "@/lib/utils";
import type { AppState } from "@/types";

const CHECK_INTERVAL_MS = 30_000;
const SESSION_LEAD_MINUTES = 10;

const KIND_LABEL = { exam: "DS", oral: "Colle", assignment: "DM" } as const;

/**
 * Mounted once app-wide (see AppShell). Doesn't render anything — while reminders are
 * enabled, it polls the schedule and fires a browser Notification when a session is about
 * to start, or once a day when a deadline is imminent. Only works while this tab is open;
 * true background delivery (tab closed) would need a service worker + push server, which
 * is out of scope without a backend.
 */
export function ReminderEngine() {
  const enabled = useAppStore((s) => s.remindersEnabled);
  const stateRef = useRef<AppState>(useAppStore.getState());
  useEffect(() => useAppStore.subscribe((s) => { stateRef.current = s; }), []);

  const notifiedSessions = useRef<Set<string>>(new Set());
  const notifiedDeadlineDay = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;

    function check() {
      if (Notification.permission !== "granted") return;
      const state = stateRef.current;
      const today = todayISO();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const s of state.studySessions) {
        if (s.date !== today || s.status !== "a_faire" || s.type === "pause") continue;
        if (notifiedSessions.current.has(s.id)) continue;
        const startMin = timeToMinutes(s.startTime);
        const diff = startMin - nowMinutes;
        if (diff < 0 || diff > SESSION_LEAD_MINUTES) continue;
        const subject = state.subjects.find((sub) => sub.id === s.subjectId);
        notifiedSessions.current.add(s.id);
        new Notification(diff <= 1 ? "C'est l'heure de réviser" : `Dans ${diff} min : ${subject?.name ?? "Session"}`, {
          body: s.title,
          tag: `session-${s.id}`,
        });
      }

      if (notifiedDeadlineDay.current !== today) {
        const items = getUpcomingDeadlines(state, 5, 1);
        const dueSoon = items.filter((i) => i.date === today);
        if (dueSoon.length > 0) {
          notifiedDeadlineDay.current = today;
          const body = dueSoon.map((i) => `${KIND_LABEL[i.kind]} · ${i.title}`).join("\n");
          new Notification(dueSoon.length === 1 ? "Échéance aujourd'hui" : `${dueSoon.length} échéances aujourd'hui`, {
            body,
            tag: `deadlines-${today}`,
          });
        } else {
          notifiedDeadlineDay.current = today;
        }
      }
    }

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  return null;
}
