"use client";

import { useSyncExternalStore } from "react";
import { AlarmClock, Play } from "lucide-react";
import type { StudySession } from "@/types";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { timeToMinutes } from "@/lib/utils";

const LEAD_MINUTES = 15;

function currentMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// The wall clock is an external value the server can't know at build/prerender time, so it's
// read via useSyncExternalStore (server snapshot: null) rather than useState+useEffect —
// that avoids a hydration-mismatch render entirely instead of papering over it afterwards.
function subscribeToClock(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}
function getClockSnapshot(): number {
  return currentMinutes();
}
function getServerClockSnapshot(): number | null {
  return null;
}

/**
 * A reliable, permission-free fallback to browser Notifications (see ReminderEngine):
 * as long as the app is open, this surfaces the next session due to start within 15
 * minutes right at the top of the page, so it's impossible to miss even without granting
 * notification access — which matters a lot on mobile Safari, where it's unreliable anyway.
 */
export function ImminentSessionBanner({
  sessions,
  onStart,
}: {
  sessions: StudySession[];
  onStart: (session: StudySession) => void;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const nowMinutes = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);

  if (nowMinutes === null) return null;

  const next = sessions
    .filter((s) => s.status === "a_faire" && s.type !== "pause")
    .map((s) => ({ session: s, diff: timeToMinutes(s.startTime) - nowMinutes }))
    .filter(({ diff }) => diff >= 0 && diff <= LEAD_MINUTES)
    .sort((a, b) => a.diff - b.diff)[0];

  if (!next) return null;

  const { session, diff } = next;
  const subject = subjects.find((sub) => sub.id === session.subjectId);
  const color = subject ? subjectColorVar(subject.colorKey) : "var(--accent)";

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border px-4 py-3 animate-fade-in-up"
      style={{ borderColor: color, background: "var(--surface)" }}
    >
      <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--surface-hover)", color }}>
        <AlarmClock size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {diff <= 1 ? "Ça commence maintenant" : `Dans ${diff} min`} · <span style={{ color }}>{subject?.name}</span> — {session.title}
        </p>
      </div>
      <button
        onClick={() => onStart(session)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-white cursor-pointer shrink-0 hover:brightness-110 active:scale-[0.97] transition"
        style={{ background: color }}
      >
        <Play size={13} fill="currentColor" /> Commencer
      </button>
    </div>
  );
}
