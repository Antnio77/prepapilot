"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, FieldRow, Input, Label, Select } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { isSlotAvailable } from "@/lib/scheduling/generate";
import { minutesToTime, timeToMinutes, todayISO } from "@/lib/utils";
import type { SessionType, StudySession } from "@/types";

const TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "exercices", label: "Exercices" },
  { value: "revision", label: "Révision de cours" },
  { value: "preparation_ds", label: "Préparation DS" },
  { value: "preparation_colle", label: "Préparation colle" },
  { value: "devoir", label: "DM" },
  { value: "cours", label: "Cours" },
];

export function SessionFormModal({
  open,
  onClose,
  session,
  defaultDate,
  defaultStartTime,
}: {
  open: boolean;
  onClose: () => void;
  session: StudySession | null;
  defaultDate?: string;
  defaultStartTime?: string;
}) {
  const state = useAppStore((s) => s);
  const subjects = state.subjects;
  const chapters = state.chapters;
  const addStudySession = useAppStore((s) => s.addStudySession);
  const updateStudySession = useAppStore((s) => s.updateStudySession);
  const deleteStudySession = useAppStore((s) => s.deleteStudySession);

  // `key`-ed by the parent (session id + default date), so this state only ever
  // needs its initial value — no effect required to resync on a different session.
  const [subjectId, setSubjectId] = useState(session?.subjectId ?? subjects[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(session?.chapterId ?? "");
  const [title, setTitle] = useState(session?.title ?? "");
  const [type, setType] = useState<SessionType>(
    session && session.type !== "pause" ? session.type : "exercices"
  );
  const [date, setDate] = useState(session?.date ?? defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState(session?.startTime ?? defaultStartTime ?? "18:00");
  const [endTime, setEndTime] = useState(session?.endTime ?? addMinutes(session?.startTime ?? defaultStartTime ?? "18:00", 45));
  const [error, setError] = useState<string | null>(null);

  const chapterOptions = chapters.filter((c) => c.subjectId === subjectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSlotAvailable(state, date, timeToMinutes(startTime), timeToMinutes(endTime), session?.id)) {
      setError("Ce créneau n'est pas dans tes disponibilités (vérifie tes cours et tes créneaux libres dans Réglages).");
      return;
    }
    setError(null);

    const finalTitle = title.trim() || chapterOptions.find((c) => c.id === chapterId)?.name || "Session de travail";
    const durationMinutes = Math.max(
      10,
      timeDiffMinutes(startTime, endTime)
    );

    if (session) {
      updateStudySession(session.id, {
        subjectId: subjectId || null,
        chapterId: chapterId || null,
        title: finalTitle,
        type,
        date,
        startTime,
        endTime,
        durationMinutes,
      });
    } else {
      addStudySession({
        subjectId: subjectId || null,
        chapterId: chapterId || null,
        title: finalTitle,
        type,
        date,
        startTime,
        endTime,
        durationMinutes,
        priority: "moyenne",
        reason: "Ajoutée manuellement",
        sourceType: null,
        sourceId: null,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (session) deleteStudySession(session.id, { reschedule: false });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? "Modifier la session" : "Nouvelle session"}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div>
            <Label>Matière</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Aucune</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Chapitre (optionnel)</Label>
            <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
              <option value="">Aucun</option>
              {chapterOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Exercices d'intégration" />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as SessionType)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <FieldRow>
            <div>
              <Label>Début</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </FieldRow>
          {error && <p className="text-xs text-danger">{error}</p>}
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {session ? (
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
            <Button type="submit">{session ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function timeDiffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}
