"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { AlertTriangle } from "lucide-react";

export function WeakestChapters() {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);

  const weakest = [...chapters].sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chapitres les moins maîtrisés</CardTitle>
      </CardHeader>
      <CardContent>
        {weakest.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Aucun chapitre" className="py-8" />
        ) : (
          <ul className="space-y-3.5">
            {weakest.map((c) => {
              const subject = subjects.find((s) => s.id === c.subjectId);
              const color = subject ? subjectColorVar(subject.colorKey) : "var(--muted)";
              return (
                <li key={c.id}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted">{subject?.name}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">{c.mastery}%</span>
                  </div>
                  <ProgressBar value={c.mastery} color={color} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
