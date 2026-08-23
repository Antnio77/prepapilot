"use client";

import { FileText, Mic, PenLine } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { getUpcomingDeadlines } from "@/lib/selectors";
import { subjectColorVar } from "@/lib/subjects";
import { relativeDayLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

const KIND_ICON = { exam: FileText, oral: Mic, assignment: PenLine } as const;
const KIND_LABEL = { exam: "DS", oral: "Colle", assignment: "DM" } as const;

export function DeadlinesList({ limit = 4 }: { limit?: number }) {
  const state = useAppStore((s) => s);
  const items = getUpcomingDeadlines(state, limit);
  const subjects = state.subjects;

  return (
    <Card className="animate-fade-in-up [animation-delay:160ms]">
      <CardHeader>
        <CardTitle>Prochaines échéances</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {items.length === 0 ? (
          <EmptyState title="Aucune échéance à venir" description="Ajoute un DS, une colle ou un DM depuis la page Échéances." />
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const subject = subjects.find((s) => s.id === item.subjectId);
              const Icon = KIND_ICON[item.kind];
              const color = subject ? subjectColorVar(subject.colorKey) : "var(--muted)";
              return (
                <li key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border-soft last:border-0">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-hover)", color }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted">
                      {KIND_LABEL[item.kind]} · {subject?.name}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {relativeDayLabel(item.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
