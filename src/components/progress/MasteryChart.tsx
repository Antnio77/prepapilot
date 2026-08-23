"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { subjectColorVar } from "@/lib/subjects";
import { useAppStore } from "@/lib/store/useAppStore";
import { TrendingUp } from "lucide-react";

export function MasteryChart() {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);

  const data = subjects
    .map((s) => {
      const chs = chapters.filter((c) => c.subjectId === s.id);
      const avg = chs.length === 0 ? 0 : Math.round(chs.reduce((sum, c) => sum + c.mastery, 0) / chs.length);
      return { name: s.name, mastery: avg, color: subjectColorVar(s.colorKey), count: chs.length };
    })
    .filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression par matière</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Pas encore de chapitres" className="py-8" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  formatter={(value) => [`${value}%`, "Maîtrise moyenne"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="mastery" radius={[6, 6, 0, 0]} barSize={28}>
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
