"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store/useAppStore";
import { weekdayLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

const DAYS = Array.from({ length: 7 }, (_, i) => i);

export function ScheduleSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"disponibilites" | "cours">("disponibilites");

  return (
    <Modal open={open} onClose={onClose} title="Réglages du planning" className="sm:max-w-xl">
      <div className="flex gap-1 mb-5 bg-surface-hover rounded-lg p-1 w-fit">
        <TabButton active={tab === "disponibilites"} onClick={() => setTab("disponibilites")}>
          Disponibilités
        </TabButton>
        <TabButton active={tab === "cours"} onClick={() => setTab("cours")}>
          Emploi du temps
        </TabButton>
      </div>

      {tab === "disponibilites" ? <AvailabilityEditor /> : <CoursesEditor />}
    </Modal>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
        active ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function AvailabilityEditor() {
  const availability = useAppStore((s) => s.availability);
  const addAvailability = useAppStore((s) => s.addAvailability);
  const updateAvailability = useAppStore((s) => s.updateAvailability);
  const deleteAvailability = useAppStore((s) => s.deleteAvailability);

  return (
    <div>
      <p className="text-xs text-muted mb-3">
        Tes créneaux libres habituels, semaine type. PrépaPilot ne planifiera jamais de révision en dehors de ces plages.
      </p>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {availability
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
          .map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Select
                value={a.dayOfWeek}
                onChange={(e) => updateAvailability(a.id, { dayOfWeek: Number(e.target.value) })}
                className="w-32 shrink-0"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {weekdayLabel(d)}
                  </option>
                ))}
              </Select>
              <Input type="time" value={a.startTime} onChange={(e) => updateAvailability(a.id, { startTime: e.target.value })} />
              <span className="text-muted text-sm">→</span>
              <Input type="time" value={a.endTime} onChange={(e) => updateAvailability(a.id, { endTime: e.target.value })} />
              <button
                onClick={() => deleteAvailability(a.id)}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => addAvailability({ dayOfWeek: 0, startTime: "18:00", endTime: "20:00" })}
      >
        <Plus size={14} /> Ajouter un créneau
      </Button>
    </div>
  );
}

function CoursesEditor() {
  const courseEvents = useAppStore((s) => s.courseEvents);
  const subjects = useAppStore((s) => s.subjects);
  const addCourseEvent = useAppStore((s) => s.addCourseEvent);
  const updateCourseEvent = useAppStore((s) => s.updateCourseEvent);
  const deleteCourseEvent = useAppStore((s) => s.deleteCourseEvent);

  return (
    <div>
      <p className="text-xs text-muted mb-3">Tes cours fixes de la semaine, pour que le planning ne s&apos;y superpose jamais.</p>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {courseEvents
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
          .map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Select value={c.dayOfWeek} onChange={(e) => updateCourseEvent(c.id, { dayOfWeek: Number(e.target.value) })} className="w-24 shrink-0">
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {weekdayLabel(d, true)}
                  </option>
                ))}
              </Select>
              <Select
                value={c.subjectId}
                onChange={(e) => {
                  const subject = subjects.find((s) => s.id === e.target.value);
                  updateCourseEvent(c.id, { subjectId: e.target.value, title: subject?.name ?? c.title });
                }}
                className="w-28 shrink-0"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Input type="time" value={c.startTime} onChange={(e) => updateCourseEvent(c.id, { startTime: e.target.value })} />
              <Input type="time" value={c.endTime} onChange={(e) => updateCourseEvent(c.id, { endTime: e.target.value })} />
              <button
                onClick={() => deleteCourseEvent(c.id)}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() =>
          subjects[0] &&
          addCourseEvent({ dayOfWeek: 0, subjectId: subjects[0].id, title: subjects[0].name, startTime: "08:00", endTime: "10:00" })
        }
      >
        <Plus size={14} /> Ajouter un cours
      </Button>
    </div>
  );
}
