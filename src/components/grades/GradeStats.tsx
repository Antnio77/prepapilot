"use client";

import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/lib/store/useAppStore";
import { weightedAverage } from "@/lib/grades";

export function GradeStats() {
  const grades = useAppStore((s) => s.grades);
  const overall = weightedAverage(grades);
  const dsCount = grades.filter((g) => g.kind === "ds").length;
  const colleCount = grades.filter((g) => g.kind === "colle").length;
  const bestRank = grades
    .filter((g) => g.rank != null)
    .reduce((best, g) => (best === null || (g.rank as number) < best ? (g.rank as number) : best), null as number | null);

  const stats = [
    { label: "Moyenne générale", value: overall !== null ? `${overall.toFixed(1)}/20` : "—" },
    { label: "DS enregistrés", value: `${dsCount}` },
    { label: "Colles enregistrées", value: `${colleCount}` },
    { label: "Meilleur rang", value: bestRank !== null ? `${bestRank}e` : "—" },
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
