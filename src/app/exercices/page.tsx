"use client";

import { useMemo, useState } from "react";
import { Layers, Play, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { dueExercises, isDue } from "@/lib/exercises";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ExerciseFormModal } from "@/components/exercises/ExerciseFormModal";
import { ExerciseReviewer } from "@/components/exercises/ExerciseReviewer";
import { MathText } from "@/components/exercises/MathText";
import { relativeDayLabel } from "@/lib/utils";
import type { Exercise, ExerciseRating } from "@/types";

const ALL = "__all__";

export default function ExercisesPage() {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);
  const exercises = useAppStore((s) => s.exercises);
  const rateExercise = useAppStore((s) => s.rateExercise);

  const [subjectFilter, setSubjectFilter] = useState<string>(ALL);
  const [chapterFilter, setChapterFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [formNonce, setFormNonce] = useState(0);

  // The queue is frozen when a session starts: rating an exercise rewrites its due date, and a
  // live-filtered list would reshuffle under you mid-review.
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (subjectFilter === ALL || e.subjectId === subjectFilter) &&
          (chapterFilter === ALL || e.chapterId === chapterFilter)
      ),
    [exercises, subjectFilter, chapterFilter]
  );

  const due = useMemo(() => dueExercises(filtered), [filtered]);
  const chapterOptions = chapters.filter((c) => subjectFilter === ALL || c.subjectId === subjectFilter);

  const queue = useMemo(() => {
    if (!queueIds) return [];
    // Re-read from the store so a card rated "Raté" (due again today) comes back round.
    return queueIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => Boolean(e) && isDue(e!));
  }, [queueIds, exercises]);

  function startReview() {
    setQueueIds(due.map((e) => e.id));
    setReviewedCount(0);
  }

  function handleRate(exercise: Exercise, rating: ExerciseRating) {
    rateExercise(exercise.id, rating);
    setReviewedCount((n) => n + 1);
    // Send a failed card to the back of today's queue instead of straight back to the front.
    setQueueIds((ids) => {
      if (!ids) return ids;
      const rest = ids.filter((id) => id !== exercise.id);
      return rating === "rate" ? [...rest, exercise.id] : rest;
    });
  }

  function openCreate() {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  const reviewing = queueIds !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercices</h1>
          <p className="text-sm text-muted mt-1">
            {due.length > 0
              ? `${due.length} exercice${due.length > 1 ? "s" : ""} à revoir${subjectFilter === ALL ? "" : " ici"}.`
              : "Rien à revoir pour l'instant."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} /> Exercice
        </Button>
      </div>

      {reviewing && queue.length > 0 ? (
        <ExerciseReviewer
          queue={queue}
          onRate={handleRate}
          onEdit={openEdit}
          onFinish={() => setQueueIds(null)}
          reviewedCount={reviewedCount}
        />
      ) : reviewing ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Layers}
              title="Série terminée"
              description={`${reviewedCount} exercice${reviewedCount > 1 ? "s" : ""} revu${reviewedCount > 1 ? "s" : ""}. Ils reviendront d'eux-mêmes au bon moment.`}
              action={
                <Button variant="secondary" onClick={() => setQueueIds(null)}>
                  Revenir à la liste
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setChapterFilter(ALL);
              }}
              className="h-9 px-3 pr-8 rounded-lg bg-surface border border-border text-sm cursor-pointer"
            >
              <option value={ALL}>Toutes les matières</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="h-9 px-3 pr-8 rounded-lg bg-surface border border-border text-sm cursor-pointer"
            >
              <option value={ALL}>Tous les chapitres</option>
              {chapterOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button onClick={startReview} disabled={due.length === 0} className="ml-auto">
              <Play size={15} fill="currentColor" /> Réviser ({due.length})
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Layers}
                  title="Aucun exercice"
                  description="Ajoute un exercice avec son énoncé et sa correction : il te sera reproposé de moins en moins souvent à mesure que tu le réussis."
                  action={
                    <Button variant="secondary" onClick={openCreate}>
                      <Plus size={14} /> Ajouter un exercice
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => {
                const subject = subjects.find((s) => s.id === e.subjectId);
                const chapter = chapters.find((c) => c.id === e.chapterId);
                const overdue = isDue(e);
                return (
                  <button
                    key={e.id}
                    onClick={() => openEdit(e)}
                    className="w-full text-left rounded-xl border border-border-soft bg-surface px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: subject ? subjectColorVar(subject.colorKey) : "var(--muted)" }}
                      />
                      <span className="text-xs text-muted">{subject?.name ?? "Sans matière"}</span>
                      {chapter && <span className="text-xs text-muted-foreground">· {chapter.name}</span>}
                      <Badge tone={overdue ? "accent" : "neutral"} className="ml-auto">
                        {overdue ? "à revoir" : relativeDayLabel(e.dueDate)}
                      </Badge>
                    </div>
                    <MathText text={e.statement} className="text-sm line-clamp-3" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <ExerciseFormModal
        key={`${editing?.id ?? "new"}-${formNonce}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        exercise={editing}
        defaultSubjectId={subjectFilter === ALL ? undefined : subjectFilter}
        defaultChapterId={chapterFilter === ALL ? undefined : chapterFilter}
      />
    </div>
  );
}
