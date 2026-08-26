"use client";

import { useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { GRADE_KIND_LABEL, gradesForSubject, weightedAverage } from "@/lib/grades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradeFormModal } from "@/components/grades/GradeFormModal";
import { formatDateShort } from "@/lib/utils";
import type { Grade } from "@/types";

function averageColor(avg: number): string {
  if (avg < 10) return "var(--danger)";
  if (avg < 14) return "var(--warning)";
  return "var(--success)";
}

export function GradesSection() {
  const subjects = useAppStore((s) => s.subjects);
  const grades = useAppStore((s) => s.grades);
  const [modalSubject, setModalSubject] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  // Bumped on every open so two consecutive "add" flows (both keyed by subject + "new")
  // still force a fresh modal instance — otherwise the form would keep the previous
  // entry's values instead of resetting to the defaults.
  const [formNonce, setFormNonce] = useState(0);

  function openAdd(subjectId: string) {
    setModalSubject(subjectId);
    setEditGrade(null);
    setFormNonce((n) => n + 1);
  }

  function openEdit(subjectId: string, grade: Grade) {
    setModalSubject(subjectId);
    setEditGrade(grade);
    setFormNonce((n) => n + 1);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight mb-1">Notes</h2>
      <p className="text-sm text-muted mb-4">Tes notes de DS et de colles, matière par matière.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map((subject, i) => {
          const subjectGrades = gradesForSubject(grades, subject.id);
          const avg = weightedAverage(subjectGrades);
          const color = subjectColorVar(subject.colorKey);
          return (
            <Card key={subject.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <CardTitle>{subject.name}</CardTitle>
                  {avg !== null && (
                    <span className="text-sm font-semibold tabular-nums" style={{ color: averageColor(avg) }}>
                      {avg.toFixed(1)}/20
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openAdd(subject.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Ajouter une note"
                >
                  <Plus size={16} />
                </button>
              </CardHeader>
              <CardContent>
                {subjectGrades.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="Aucune note"
                    description="Ajoute tes notes de DS et de colles pour suivre ta moyenne."
                    className="py-8"
                  />
                ) : (
                  <div>
                    {subjectGrades.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => openEdit(subject.id, g)}
                        className="w-full text-left flex items-center gap-3 py-2.5 px-1 border-b border-border-soft last:border-0 hover:bg-surface-hover -mx-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="text-[11px] font-medium text-muted-foreground bg-surface-hover rounded-md px-1.5 py-0.5 shrink-0">
                          {GRADE_KIND_LABEL[g.kind]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{g.label}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {formatDateShort(g.date)}
                            {g.coefficient !== 1 && ` · coef. ${g.coefficient}`}
                            {g.rank != null && ` · rang ${g.rank}`}
                            {g.classAverage != null && ` · classe ${g.classAverage}/20`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: averageColor(g.value) }}>
                          {g.value}/20
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GradeFormModal
        key={`${modalSubject ?? "none"}-${editGrade?.id ?? "new"}-${formNonce}`}
        open={modalSubject !== null}
        onClose={() => setModalSubject(null)}
        subjectId={modalSubject ?? subjects[0]?.id ?? ""}
        grade={editGrade}
      />
    </div>
  );
}
