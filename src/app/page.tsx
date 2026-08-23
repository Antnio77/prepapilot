"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dayProgress } from "@/lib/selectors";
import { todayISO } from "@/lib/utils";
import type { StudySession } from "@/types";
import { TodayHeader } from "@/components/today/TodayHeader";
import { StatsCards } from "@/components/today/StatsCards";
import { DeadlinesList } from "@/components/today/DeadlinesList";
import { EveningPlan } from "@/components/today/EveningPlan";
import { ImminentSessionBanner } from "@/components/today/ImminentSessionBanner";
import { SessionTimer } from "@/components/session/SessionTimer";

export default function TodayPage() {
  const state = useAppStore((s) => s);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);

  const { sessions, plannedMinutes, doneCount, totalCount, pct } = dayProgress(state, todayISO());

  return (
    <div className="space-y-6 sm:space-y-8">
      <TodayHeader />
      <ImminentSessionBanner sessions={sessions} onStart={setActiveSession} />
      <StatsCards plannedMinutes={plannedMinutes} doneCount={doneCount} totalCount={totalCount} pct={pct} />

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <EveningPlan sessions={sessions} onStart={setActiveSession} />
        </div>
        <div className="lg:col-span-1">
          <DeadlinesList />
        </div>
      </div>

      <SessionTimer key={activeSession?.id ?? "none"} session={activeSession} onClose={() => setActiveSession(null)} />
    </div>
  );
}
