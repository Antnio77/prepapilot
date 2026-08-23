"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChapterRow } from "@/components/subjects/ChapterRow";
import { ChapterFormModal } from "@/components/subjects/ChapterFormModal";
import type { Chapter } from "@/types";
import { BookOpen } from "lucide-react";

export default function SubjectsPage() {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);
  const [modalSubject, setModalSubject] = useState<string | null>(null);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);

  function openAdd(subjectId: string) {
    setModalSubject(subjectId);
    setEditChapter(null);
  }

  function openEdit(subjectId: string, chapter: Chapter) {
    setModalSubject(subjectId);
    setEditChapter(chapter);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matières</h1>
        <p className="text-sm text-muted mt-1">Suis la maîtrise de chaque chapitre pour guider tes révisions.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {subjects.map((subject, i) => {
          const subjectChapters = chapters.filter((c) => c.subjectId === subject.id);
          const color = subjectColorVar(subject.colorKey);
          return (
            <Card key={subject.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <CardTitle>{subject.name}</CardTitle>
                </div>
                <button
                  onClick={() => openAdd(subject.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Ajouter un chapitre"
                >
                  <Plus size={16} />
                </button>
              </CardHeader>
              <CardContent>
                {subjectChapters.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="Aucun chapitre"
                    description="Ajoute les chapitres de cette matière pour suivre ta progression."
                    action={
                      <Button size="sm" variant="secondary" onClick={() => openAdd(subject.id)}>
                        <Plus size={14} /> Ajouter un chapitre
                      </Button>
                    }
                    className="py-8"
                  />
                ) : (
                  <div>
                    {subjectChapters.map((c) => (
                      <ChapterRow key={c.id} chapter={c} onEdit={(chap) => openEdit(subject.id, chap)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ChapterFormModal
        key={`${modalSubject ?? "none"}-${editChapter?.id ?? "new"}`}
        open={modalSubject !== null}
        onClose={() => setModalSubject(null)}
        subjectId={modalSubject ?? ""}
        chapter={editChapter}
      />
    </div>
  );
}
