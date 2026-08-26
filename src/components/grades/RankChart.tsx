"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/useAppStore";
import { rankSeries } from "@/lib/grades";
import { formatDateShort } from "@/lib/utils";
import { Trophy } from "lucide-react";

export function RankChart() {
  const grades = useAppStore((s) => s.grades);
  const data = rankSeries(grades).map((p) => ({ ...p, dateLabel: formatDateShort(p.date) }));
  const maxRank = data.reduce((max, p) => Math.max(max, p.rank), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution du rang (DS)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Pas encore de rang"
            description="Renseigne ton rang en ajoutant une note de DS pour voir son évolution."
            className="py-8"
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -8, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  reversed
                  allowDecimals={false}
                  domain={[1, Math.max(5, maxRank)]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                  formatter={(value) => [`${value}e`, "Rang"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--accent)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
