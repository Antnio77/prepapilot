"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { subjectColorVar } from "@/lib/subjects";
import { useAppStore } from "@/lib/store/useAppStore";
import { averagesBySubject } from "@/lib/grades";
import { BarChart3 } from "lucide-react";

export function AverageBySubjectChart() {
  const subjects = useAppStore((s) => s.subjects);
  const grades = useAppStore((s) => s.grades);
  const colorBySubject = new Map(subjects.map((s) => [s.id, subjectColorVar(s.colorKey)]));

  const data = averagesBySubject(subjects, grades).map((s) => ({
    name: s.name,
    average: Math.round(s.average * 10) / 10,
    color: colorBySubject.get(s.subjectId) ?? "var(--accent)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moyenne par matière</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="Pas encore de notes" description="Ajoute des notes pour voir la répartition par matière." className="py-8" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  formatter={(value) => [`${value}/20`, "Moyenne"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="average" radius={[6, 6, 0, 0]} barSize={28} isAnimationActive={false}>
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
