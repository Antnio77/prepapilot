"use client";

import { useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, FieldRow, Label, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { MathText } from "./MathText";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

export function ExerciseFormModal({
  open,
  onClose,
  exercise,
  defaultSubjectId,
  defaultChapterId,
}: {
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  defaultSubjectId?: string;
  defaultChapterId?: string | null;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);
  const addExercise = useAppStore((s) => s.addExercise);
  const updateExercise = useAppStore((s) => s.updateExercise);
  const deleteExercise = useAppStore((s) => s.deleteExercise);

  // Keyed by the parent, so these initial values are all this state ever needs.
  const [subjectId, setSubjectId] = useState(exercise?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "");
  const [chapterId, setChapterId] = useState<string>(exercise?.chapterId ?? defaultChapterId ?? "");
  const [statement, setStatement] = useState(exercise?.statement ?? "");
  const [answer, setAnswer] = useState(exercise?.answer ?? "");
  const [preview, setPreview] = useState(false);

  const chapterOptions = chapters.filter((c) => c.subjectId === subjectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statement.trim()) return;
    const payload = {
      subjectId,
      chapterId: chapterId || null,
      statement: statement.trim(),
      answer: answer.trim(),
    };
    if (exercise) updateExercise(exercise.id, payload);
    else addExercise(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={exercise ? "Modifier l'exercice" : "Nouvel exercice"}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FieldRow>
            <div>
              <Label>Matière</Label>
              <Select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setChapterId(""); // the old chapter belongs to the old subject
                }}
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Chapitre</Label>
              <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                <option value="">Aucun</option>
                {chapterOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </FieldRow>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-muted">Énoncé</span>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] rounded-md px-2 py-1 transition-colors cursor-pointer",
                  preview ? "bg-accent-soft text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                )}
              >
                <Eye size={13} /> Aperçu
              </button>
            </div>
            {preview ? (
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 min-h-20 text-sm">
                {statement.trim() ? <MathText text={statement} /> : <span className="text-muted-foreground">Rien à afficher.</span>}
              </div>
            ) : (
              <Textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder={"Calculer $\\int_0^1 x^2\\,dx$.\n\nUne formule seule se met entre $$ :\n$$\\sum_{n=1}^{+\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$"}
                autoFocus
                required
              />
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              LaTeX entre <code className="text-foreground">$…$</code> dans une phrase, entre{" "}
              <code className="text-foreground">$$…$$</code> pour une formule centrée.
            </p>
          </div>

          <div>
            <Label>Correction</Label>
            {preview ? (
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 min-h-20 text-sm">
                {answer.trim() ? <MathText text={answer} /> : <span className="text-muted-foreground">Rien à afficher.</span>}
              </div>
            ) : (
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={"$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$"} />
            )}
          </div>
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {exercise ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deleteExercise(exercise.id);
                onClose();
              }}
            >
              <Trash2 size={14} /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{exercise ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
