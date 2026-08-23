"use client";

import { useState } from "react";
import { FileText, Mic, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Label } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { DIFFICULTY_LEVELS, difficultyLevel } from "@/lib/difficulty";
import { linkedDeadlinesForChapter } from "@/lib/selectors";
import { cn, relativeDayLabel } from "@/lib/utils";
import type { Chapter } from "@/types";

const KIND_ICON = { exam: FileText, oral: Mic } as const;
const KIND_LABEL = { exam: "DS", oral: "Colle" } as const;

export function ChapterFormModal({
  open,
  onClose,
  subjectId,
  chapter,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  chapter: Chapter | null;
}) {
  const state = useAppStore((s) => s);
  const addChapter = useAppStore((s) => s.addChapter);
  const updateChapter = useAppStore((s) => s.updateChapter);
  const deleteChapter = useAppStore((s) => s.deleteChapter);
  const linkedDeadlines = chapter ? linkedDeadlinesForChapter(state, chapter.id) : [];

  // `key`-ed by the parent (subject + chapter id), so this state only ever needs
  // its initial value — no effect required to resync when a different chapter opens.
  const [name, setName] = useState(chapter?.name ?? "");
  const [mastery, setMastery] = useState(chapter?.mastery ?? 20);
  const [difficulty, setDifficulty] = useState(chapter?.difficulty ?? 3);
  const [lastReviewedAt, setLastReviewedAt] = useState(chapter?.lastReviewedAt ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (chapter) {
      updateChapter(chapter.id, {
        name: name.trim(),
        mastery,
        difficulty: difficulty as Chapter["difficulty"],
        lastReviewedAt: lastReviewedAt || null,
      });
    } else {
      addChapter({
        subjectId,
        name: name.trim(),
        mastery,
        difficulty: difficulty as Chapter["difficulty"],
        lastReviewedAt: lastReviewedAt || null,
      });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={chapter ? "Modifier le chapitre" : "Nouveau chapitre"}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div>
            <Label>Nom du chapitre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Intégration" autoFocus required />
          </div>

          <div>
            <Label>Maîtrise — {mastery}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={mastery}
              onChange={(e) => setMastery(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <p className="text-xs text-muted mt-1.5">Où tu en es aujourd&apos;hui : 0% = jamais vu, 100% = su par cœur.</p>
          </div>

          <div>
            <Label>Difficulté</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {DIFFICULTY_LEVELS.map((lvl) => (
                <button
                  type="button"
                  key={lvl.value}
                  onClick={() => setDifficulty(lvl.value)}
                  aria-pressed={difficulty === lvl.value}
                  className={cn(
                    "h-9 rounded-lg text-sm font-semibold border transition-colors cursor-pointer",
                    difficulty === lvl.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-surface border-border text-muted hover:text-foreground hover:border-muted-foreground/40"
                  )}
                >
                  {lvl.value}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">
              <span className="font-medium text-foreground">{difficultyLevel(difficulty).label}</span> — {difficultyLevel(difficulty).description}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sert à doser le temps de révision que PrépaPilot te propose pour ce chapitre.
            </p>
          </div>

          <div>
            <Label>Dernière révision</Label>
            <Input type="date" value={lastReviewedAt} onChange={(e) => setLastReviewedAt(e.target.value)} />
          </div>

          {chapter && (
            <div>
              <Label>Échéances liées</Label>
              {linkedDeadlines.length === 0 ? (
                <p className="text-xs text-muted">
                  Aucune pour l&apos;instant — lie ce chapitre à un DS ou une colle depuis la page Échéances pour qu&apos;il soit
                  priorisé à l&apos;approche de la date.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {linkedDeadlines.map((d) => {
                    const Icon = KIND_ICON[d.kind];
                    return (
                      <li key={d.id} className="flex items-center gap-2 text-xs text-muted bg-surface-hover rounded-lg px-2.5 py-2">
                        <Icon size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium truncate flex-1">
                          {KIND_LABEL[d.kind]} · {d.title}
                        </span>
                        <span className="shrink-0">{relativeDayLabel(d.date)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {chapter ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deleteChapter(chapter.id);
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
            <Button type="submit">{chapter ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
