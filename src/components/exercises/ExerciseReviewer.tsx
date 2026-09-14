"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { previewInterval, RATINGS } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import { MathText } from "./MathText";
import type { Exercise, ExerciseRating } from "@/types";

const RATING_CLASS: Record<ExerciseRating, string> = {
  rate: "border-danger/40 text-danger hover:bg-danger-soft",
  difficile: "border-warning/40 text-warning hover:bg-warning-soft",
  bien: "border-accent/40 text-accent hover:bg-accent-soft",
  facile: "border-success/40 text-success hover:bg-success-soft",
};

/**
 * One exercise at a time: statement first, correction only once you ask for it.
 *
 * The reveal is deliberately a wall — rating how it went is only honest if you committed to an
 * answer before seeing the correction, so the buttons don't exist until then. Each one shows
 * when that choice would bring the exercise back, so the spacing is a visible consequence of
 * the rating rather than something happening off-screen.
 */
export function ExerciseReviewer({
  queue,
  onRate,
  onEdit,
  onFinish,
  reviewedCount,
}: {
  queue: Exercise[];
  onRate: (exercise: Exercise, rating: ExerciseRating) => void;
  onEdit: (exercise: Exercise) => void;
  onFinish: () => void;
  reviewedCount: number;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);
  const [revealed, setRevealed] = useState(false);

  const exercise = queue[0];
  if (!exercise) return null;

  const subject = subjects.find((s) => s.id === exercise.subjectId);
  const chapter = chapters.find((c) => c.id === exercise.chapterId);
  const color = subject ? subjectColorVar(subject.colorKey) : "var(--accent)";

  function rate(rating: ExerciseRating) {
    onRate(exercise, rating);
    setRevealed(false); // the next card must start hidden
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[13px] font-medium truncate">{subject?.name ?? "Sans matière"}</span>
          {chapter && <span className="text-[13px] text-muted truncate">· {chapter.name}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {reviewedCount + 1} / {reviewedCount + queue.length}
          </span>
          <button
            onClick={() => onEdit(exercise)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
            aria-label="Modifier l'exercice"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onFinish}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
            aria-label="Arrêter la révision"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Énoncé</p>
        <MathText text={exercise.statement} className="text-[15px]" />

        {revealed && (
          <div className="mt-6 pt-5 border-t border-border-soft animate-fade-in-up">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Correction</p>
            {exercise.answer ? (
              <MathText text={exercise.answer} className="text-[15px]" />
            ) : (
              <p className="text-sm text-muted-foreground">Aucune correction saisie pour cet exercice.</p>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        {revealed ? (
          <>
            <p className="text-xs text-muted mb-2.5">Comment ça s&apos;est passé ?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => rate(r.value)}
                  title={r.hint}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border bg-surface px-2 py-2.5 transition-colors cursor-pointer",
                    RATING_CLASS[r.value]
                  )}
                >
                  <span className="text-[13px] font-semibold">{r.label}</span>
                  <span className="text-[11px] opacity-70 tabular-nums">{previewInterval(exercise, r.value)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Button className="w-full" size="lg" onClick={() => setRevealed(true)}>
            <Check size={16} /> Afficher la correction
          </Button>
        )}
      </div>
    </div>
  );
}
