"use client";

import { FileText, Mic, PenLine } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import type { DeadlineItem } from "@/lib/selectors";
import { subjectColorVar } from "@/lib/subjects";
import { cn, daysBetween, relativeDayLabel, todayISO } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListChecks } from "lucide-react";

const KIND_ICON = { exam: FileText, oral: Mic, assignment: PenLine } as const;
const KIND_LABEL = { exam: "DS", oral: "Colle", assignment: "DM" } as const;

export function DeadlineList({ items, onSelect }: { items: DeadlineItem[]; onSelect: (item: DeadlineItem) => void }) {
  const subjects = useAppStore((s) => s.subjects);

  if (items.length === 0) {
    return <EmptyState icon={ListChecks} title="Aucune échéance" description="Ajoute un DS, une colle ou un DM pour commencer." />;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const subject = subjects.find((s) => s.id === item.subjectId);
        const Icon = KIND_ICON[item.kind];
        const color = subject ? subjectColorVar(subject.colorKey) : "var(--muted)";
        const daysUntil = daysBetween(todayISO(), item.date);
        const soon = daysUntil <= 2;
        return (
          <li key={`${item.kind}-${item.id}`}>
            <button
              onClick={() => onSelect(item)}
              className={cn(
                "w-full flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer hover:bg-surface-hover",
                soon ? "border-danger/25 bg-danger-soft/40" : "border-border-soft bg-surface"
              )}
            >
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--surface-hover)", color }}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted">
                  {KIND_LABEL[item.kind]} · {subject?.name} · importance {item.importance}/5
                  {item.time ? ` · ${item.time}` : ""}
                </p>
              </div>
              <span className={cn("text-xs font-semibold shrink-0", soon ? "text-danger" : "text-muted-foreground")}>
                {relativeDayLabel(item.date)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
