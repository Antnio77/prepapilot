"use client";

import { GradeStats } from "@/components/grades/GradeStats";
import { AverageBySubjectChart } from "@/components/grades/AverageBySubjectChart";
import { GradeTrendChart } from "@/components/grades/GradeTrendChart";
import { RankChart } from "@/components/grades/RankChart";
import { GradesSection } from "@/components/grades/GradesSection";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progression</h1>
        <p className="text-sm text-muted mt-1">Tes notes et ta moyenne en un coup d&apos;œil.</p>
      </div>

      <GradeStats />

      <div className="grid lg:grid-cols-2 gap-6">
        <GradeTrendChart />
        <AverageBySubjectChart />
      </div>

      <RankChart />

      <GradesSection />
    </div>
  );
}
