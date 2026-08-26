"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/useAppStore";
import { runningAverageSeries } from "@/lib/grades";
import { formatDateShort } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export function GradeTrendChart() {
  const grades = useAppStore((s) => s.grades);
  const data = runningAverageSeries(grades).map((p) => ({ ...p, dateLabel: formatDateShort(p.date) }));
  const hasClassAverage = data.some((p) => p.classAverage !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution de la moyenne</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Pas encore de notes" description="Ajoute des notes pour voir ta moyenne évoluer." className="py-8" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                {hasClassAverage && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Line
                  type="monotone"
                  dataKey="runningAverage"
                  name="Ta moyenne"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--accent)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                {hasClassAverage && (
                  <Line
                    type="monotone"
                    dataKey="classAverage"
                    name="Moyenne de la classe"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "var(--muted-foreground)" }}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
