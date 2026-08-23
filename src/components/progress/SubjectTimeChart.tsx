"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { subjectColorVar } from "@/lib/subjects";
import { useAppStore } from "@/lib/store/useAppStore";
import { BarChart3 } from "lucide-react";

export function SubjectTimeChart({ minutesBySubject }: { minutesBySubject: Map<string, number> }) {
  const subjects = useAppStore((s) => s.subjects);
  const data = subjects
    .map((s) => ({ name: s.name, minutes: minutesBySubject.get(s.id) ?? 0, color: subjectColorVar(s.colorKey) }))
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temps passé par matière (semaine)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="Pas encore de données" description="Termine des séances cette semaine pour voir la répartition." className="py-8" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--border-soft)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  formatter={(value) => [`${value} min`, "Temps"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="minutes" radius={[0, 6, 6, 0]} barSize={16}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
