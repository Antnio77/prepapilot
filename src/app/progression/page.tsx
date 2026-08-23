"use client";

import { useAppStore } from "@/lib/store/useAppStore";
import { currentWeekStats } from "@/lib/selectors";
import { WeekStatCards } from "@/components/progress/WeekStatCards";
import { SubjectTimeChart } from "@/components/progress/SubjectTimeChart";
import { MasteryChart } from "@/components/progress/MasteryChart";
import { WeakestChapters } from "@/components/progress/WeakestChapters";

export default function ProgressPage() {
  const state = useAppStore((s) => s);
  const stats = currentWeekStats(state);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progression</h1>
        <p className="text-sm text-muted mt-1">Ta semaine de travail en un coup d&apos;œil.</p>
      </div>

      <WeekStatCards
        workedMinutes={stats.workedMinutes}
        doneCount={stats.doneCount}
        plannedCount={stats.plannedCount}
        completionRate={stats.completionRate}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <SubjectTimeChart minutesBySubject={stats.minutesBySubject} />
        <MasteryChart />
      </div>

      <WeakestChapters />
    </div>
  );
}
