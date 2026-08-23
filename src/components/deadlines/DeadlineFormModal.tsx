"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, FieldRow, Input, Label, Select } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn, todayISO } from "@/lib/utils";
import type { DeadlineItem } from "@/lib/selectors";

type Kind = "exam" | "oral" | "assignment";

const KIND_LABEL: Record<Kind, string> = { exam: "DS", oral: "Colle", assignment: "DM" };

export function DeadlineFormModal({
  open,
  onClose,
  editing,
  defaultKind = "exam",
}: {
  open: boolean;
  onClose: () => void;
  editing: DeadlineItem | null;
  defaultKind?: Kind;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const chapters = useAppStore((s) => s.chapters);
  const exams = useAppStore((s) => s.exams);
  const oralExams = useAppStore((s) => s.oralExams);
  const assignments = useAppStore((s) => s.assignments);
  const addExam = useAppStore((s) => s.addExam);
  const updateExam = useAppStore((s) => s.updateExam);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const addOralExam = useAppStore((s) => s.addOralExam);
  const updateOralExam = useAppStore((s) => s.updateOralExam);
  const deleteOralExam = useAppStore((s) => s.deleteOralExam);
  const addAssignment = useAppStore((s) => s.addAssignment);
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const deleteAssignment = useAppStore((s) => s.deleteAssignment);

  // Initial values are derived once from `editing` — the parent remounts this
  // modal (via `key`) whenever a different item opens, so no effect is needed.
  function initialDuration(): number {
    if (!editing) return defaultKind === "assignment" ? 60 : 120;
    if (editing.kind === "exam") return exams.find((e) => e.id === editing.id)?.duration ?? 120;
    if (editing.kind === "assignment") return assignments.find((a) => a.id === editing.id)?.estimatedDuration ?? 60;
    return 120;
  }
  function initialChapterIds(): string[] {
    if (!editing) return [];
    if (editing.kind === "exam") return exams.find((e) => e.id === editing.id)?.chapterIds ?? [];
    if (editing.kind === "oral") return oralExams.find((o) => o.id === editing.id)?.chapterIds ?? [];
    return [];
  }

  const [kind, setKind] = useState<Kind>(editing?.kind ?? defaultKind);
  const [subjectId, setSubjectId] = useState(editing?.subjectId ?? subjects[0]?.id ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [time, setTime] = useState(editing?.time ?? "");
  const [duration, setDuration] = useState(initialDuration);
  const [importance, setImportance] = useState(editing?.importance ?? 3);
  const [chapterIds, setChapterIds] = useState<string[]>(initialChapterIds);

  const chapterOptions = chapters.filter((c) => c.subjectId === subjectId);

  function toggleChapter(id: string) {
    setChapterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "exam") {
      const payload = { name: title || "DS", subjectId, date, duration, chapterIds, importance: importance as 1 | 2 | 3 | 4 | 5 };
      if (editing) updateExam(editing.id, payload);
      else addExam(payload);
    } else if (kind === "oral") {
      const payload = { subjectId, date, time: time || undefined, theme: title || "Colle", chapterIds, importance: importance as 1 | 2 | 3 | 4 | 5 };
      if (editing) updateOralExam(editing.id, payload);
      else addOralExam(payload);
    } else {
      const payload = { title: title || "DM", subjectId, dueDate: date, estimatedDuration: duration, importance: importance as 1 | 2 | 3 | 4 | 5 };
      if (editing) updateAssignment(editing.id, payload);
      else addAssignment(payload);
    }
    onClose();
  }

  function handleDelete() {
    if (!editing) return;
    if (editing.kind === "exam") deleteExam(editing.id);
    else if (editing.kind === "oral") deleteOralExam(editing.id);
    else deleteAssignment(editing.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Modifier ${KIND_LABEL[kind]}` : "Nouvelle échéance"}>
      <form onSubmit={handleSubmit}>
        {!editing && (
          <div className="flex gap-1 mb-5 bg-surface-hover rounded-lg p-1">
            {(["exam", "oral", "assignment"] as Kind[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 h-8 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                  kind === k ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"
                )}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}

        <FieldGroup>
          <div>
            <Label>Matière</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{kind === "oral" ? "Thème / chapitre" : kind === "assignment" ? "Titre du devoir" : "Nom du DS"}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "oral" ? "Ex : Oscillateurs" : kind === "assignment" ? "Ex : DM cinétique" : "Ex : DS Maths n°3"}
              required
            />
          </div>

          <FieldRow className={kind === "oral" ? "grid-cols-2" : "grid-cols-2"}>
            <div>
              <Label>{kind === "assignment" ? "Date limite" : "Date"}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            {kind === "oral" ? (
              <div>
                <Label>Heure (optionnel)</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            ) : (
              <div>
                <Label>Durée (min)</Label>
                <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            )}
          </FieldRow>

          <div>
            <Label>Importance — {importance}/5</Label>
            <input
              type="range"
              min={1}
              max={5}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          {kind !== "assignment" && (
            <div>
              <Label>Chapitres concernés</Label>
              {chapterOptions.length === 0 ? (
                <p className="text-xs text-muted">Aucun chapitre pour cette matière.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {chapterOptions.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleChapter(c.id)}
                        className={cn(
                          "px-2.5 h-7 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                          chapterIds.includes(c.id)
                            ? "bg-accent-soft text-accent border-accent/30"
                            : "bg-surface text-muted border-border hover:text-foreground"
                        )}
                      >
                        {c.name} · {c.mastery}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    PrépaPilot programme plus de temps sur les chapitres cochés ici les moins maîtrisés, à l&apos;approche de
                    la date.
                  </p>
                </>
              )}
            </div>
          )}
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {editing ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Supprimer
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{editing ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
