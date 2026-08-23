"use client";

import { Card } from "@/components/ui/Card";
import { formatMinutes } from "@/lib/utils";

export function WeekStatCards({
  workedMinutes,
  doneCount,
  plannedCount,
  completionRate,
}: {
  workedMinutes: number;
  doneCount: number;
  plannedCount: number;
  completionRate: number;
}) {
  const stats = [
    { label: "Heures travaillées cette semaine", value: formatMinutes(workedMinutes) },
    { label: "Séances terminées", value: `${doneCount}` },
    { label: "Séances prévues", value: `${plannedCount}` },
    { label: "Taux de réalisation", value: `${completionRate}%` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <Card key={s.label} className="p-4 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
          <p className="text-xl font-semibold tabular-nums tracking-tight">{s.value}</p>
          <p className="text-xs text-muted mt-1 leading-snug">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
