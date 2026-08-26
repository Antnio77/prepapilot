"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, FieldRow, Input, Label, Select } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { GRADE_KIND_LABEL } from "@/lib/grades";
import { cn, todayISO } from "@/lib/utils";
import type { Grade, GradeKind } from "@/types";

export function GradeFormModal({
  open,
  onClose,
  subjectId,
  grade,
  defaultKind = "ds",
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  grade: Grade | null;
  defaultKind?: GradeKind;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const addGrade = useAppStore((s) => s.addGrade);
  const updateGrade = useAppStore((s) => s.updateGrade);
  const deleteGrade = useAppStore((s) => s.deleteGrade);

  // Keyed by the parent (subject + grade id), so this state only ever needs its
  // initial value — no effect required to resync when a different grade opens.
  const [kind, setKind] = useState<GradeKind>(grade?.kind ?? defaultKind);
  const [selectedSubjectId, setSelectedSubjectId] = useState(grade?.subjectId ?? subjectId);
  const [label, setLabel] = useState(grade?.label ?? "");
  const [value, setValue] = useState(grade?.value ?? 10);
  const [coefficient, setCoefficient] = useState(grade?.coefficient ?? 1);
  const [date, setDate] = useState(grade?.date ?? todayISO());
  const [rank, setRank] = useState<string>(grade?.rank != null ? String(grade.rank) : "");
  const [classAverage, setClassAverage] = useState<string>(grade?.classAverage != null ? String(grade.classAverage) : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      subjectId: selectedSubjectId,
      kind,
      label: label.trim() || GRADE_KIND_LABEL[kind],
      value,
      coefficient,
      date,
      // Rank and class average only make sense for a DS (a colle is one-on-one, no ranking).
      rank: kind === "ds" && rank.trim() !== "" ? Number(rank) : null,
      classAverage: kind === "ds" && classAverage.trim() !== "" ? Number(classAverage) : null,
    };
    if (grade) updateGrade(grade.id, payload);
    else addGrade(payload);
    onClose();
  }

  function handleDelete() {
    if (!grade) return;
    deleteGrade(grade.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={grade ? "Modifier la note" : "Nouvelle note"}>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-1 mb-5 bg-surface-hover rounded-lg p-1">
          {(["ds", "colle"] as GradeKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "flex-1 h-8 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                kind === k ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              {GRADE_KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <FieldGroup>
          <div>
            <Label>Matière</Label>
            <Select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} required>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Intitulé (optionnel)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={kind === "ds" ? "Ex : DS 3 — Intégrales" : "Ex : Colle n°2"}
            />
          </div>

          <FieldRow>
            <div>
              <Label>Note — /20</Label>
              <Input
                type="number"
                min={0}
                max={20}
                step="any"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <Label>Coefficient</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={coefficient}
                onChange={(e) => setCoefficient(Number(e.target.value))}
                required
              />
            </div>
          </FieldRow>

          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {kind === "ds" && (
            <FieldRow>
              <div>
                <Label>Rang (optionnel)</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="Ex : 5"
                />
              </div>
              <div>
                <Label>Moyenne classe (optionnel)</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step="any"
                  value={classAverage}
                  onChange={(e) => setClassAverage(e.target.value)}
                  placeholder="Ex : 11.5"
                />
              </div>
            </FieldRow>
          )}
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {grade ? (
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
            <Button type="submit">{grade ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
