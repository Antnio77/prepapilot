"use client";

import { useAppStore } from "@/lib/store/useAppStore";
import { dayProgress } from "@/lib/selectors";
import { todayISO } from "@/lib/utils";
import type { StudySession } from "@/types";
import { TodayHeader } from "@/components/today/TodayHeader";
import { StatsCards } from "@/components/today/StatsCards";
import { DeadlinesList } from "@/components/today/DeadlinesList";
import { EveningPlan } from "@/components/today/EveningPlan";
import { ImminentSessionBanner } from "@/components/today/ImminentSessionBanner";

export default function TodayPage() {
  const state = useAppStore((s) => s);
  const startSession = useAppStore((s) => s.startSession);

  const { sessions, plannedMinutes, doneCount, totalCount, pct } = dayProgress(state, todayISO());

  function handleStart(session: StudySession) {
    startSession(session.id);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <TodayHeader />
      <ImminentSessionBanner sessions={sessions} onStart={handleStart} />
      <StatsCards plannedMinutes={plannedMinutes} doneCount={doneCount} totalCount={totalCount} pct={pct} />

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <EveningPlan sessions={sessions} onStart={handleStart} />
        </div>
        <div className="lg:col-span-1">
          <DeadlinesList />
        </div>
      </div>
    </div>
  );
}
