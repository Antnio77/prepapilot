"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldGroup, FieldRow, Input, Label, Select } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { weekdayLabel } from "@/lib/utils";
import type { CourseEvent } from "@/types";

const DAYS = Array.from({ length: 7 }, (_, i) => i);

export function CourseFormModal({
  open,
  onClose,
  course,
  defaultDayOfWeek,
  defaultStartTime,
}: {
  open: boolean;
  onClose: () => void;
  course: CourseEvent | null;
  defaultDayOfWeek?: number;
  defaultStartTime?: string;
}) {
  const subjects = useAppStore((s) => s.subjects);
  const addCourseEvent = useAppStore((s) => s.addCourseEvent);
  const updateCourseEvent = useAppStore((s) => s.updateCourseEvent);
  const deleteCourseEvent = useAppStore((s) => s.deleteCourseEvent);

  const [subjectId, setSubjectId] = useState(course?.subjectId ?? subjects[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(course?.dayOfWeek ?? defaultDayOfWeek ?? 0);
  const [startTime, setStartTime] = useState(course?.startTime ?? defaultStartTime ?? "08:00");
  const [endTime, setEndTime] = useState(course?.endTime ?? addMinutes(defaultStartTime ?? "08:00", 120));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = subjects.find((s) => s.id === subjectId);
    const title = subject?.name ?? "Cours";
    if (course) {
      updateCourseEvent(course.id, { subjectId, title, dayOfWeek, startTime, endTime });
    } else {
      addCourseEvent({ subjectId, title, dayOfWeek, startTime, endTime });
    }
    onClose();
  }

  function handleDelete() {
    if (course) deleteCourseEvent(course.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? "Modifier le cours" : "Nouveau cours"}>
      <form onSubmit={handleSubmit}>
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
            <Label>Jour</Label>
            <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {weekdayLabel(d)}
                </option>
              ))}
            </Select>
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
        </FieldGroup>

        <div className="flex items-center justify-between mt-6">
          {course ? (
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
            <Button type="submit">{course ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
