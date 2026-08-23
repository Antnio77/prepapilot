"use client";

import { Clock, Flame, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressBar";
import { formatMinutes } from "@/lib/utils";

export function StatsCards({
  plannedMinutes,
  doneCount,
  totalCount,
  pct,
}: {
  plannedMinutes: number;
  doneCount: number;
  totalCount: number;
  pct: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Card className="p-4 sm:p-5 flex items-center gap-3.5 animate-fade-in-up">
        <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Clock size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums leading-tight">{formatMinutes(plannedMinutes)}</p>
          <p className="text-xs text-muted truncate">de travail prévu</p>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 flex items-center gap-3.5 animate-fade-in-up [animation-delay:60ms]">
        <div className="h-10 w-10 rounded-xl bg-success-soft text-success flex items-center justify-center shrink-0">
          <ListChecks size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {doneCount}/{totalCount}
          </p>
          <p className="text-xs text-muted truncate">séances terminées</p>
        </div>
      </Card>

      <Card className="col-span-2 sm:col-span-1 p-4 sm:p-5 flex items-center gap-3.5 animate-fade-in-up [animation-delay:120ms]">
        <ProgressRing
          value={pct}
          size={40}
          strokeWidth={4}
          color="var(--warning)"
          label={<Flame size={15} className="text-warning" />}
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums leading-tight">{pct}%</p>
          <p className="text-xs text-muted truncate">progression du jour</p>
        </div>
      </Card>
    </div>
  );
}
