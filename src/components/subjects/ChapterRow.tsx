"use client";

import { FileText, Mic } from "lucide-react";
import type { Chapter } from "@/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/lib/store/useAppStore";
import { linkedDeadlinesForChapter, nextReviewDate } from "@/lib/selectors";
import { difficultyLevel } from "@/lib/difficulty";
import { daysBetween, relativeDayLabel, relativePastLabel, todayISO } from "@/lib/utils";

const KIND_ICON = { exam: FileText, oral: Mic } as const;
const KIND_LABEL = { exam: "DS", oral: "Colle" } as const;

function masteryColor(mastery: number): string {
  if (mastery < 40) return "var(--danger)";
  if (mastery < 70) return "var(--warning)";
  return "var(--success)";
}

function daysUntilTone(date: string): "danger" | "warning" | "neutral" {
  const d = daysBetween(todayISO(), date);
  if (d <= 2) return "danger";
  if (d <= 6) return "warning";
  return "neutral";
}

export function ChapterRow({ chapter, onEdit }: { chapter: Chapter; onEdit: (c: Chapter) => void }) {
  const state = useAppStore((s) => s);
  const linked = linkedDeadlinesForChapter(state, chapter.id);
  const next = linked[0];

  return (
    <button
      onClick={() => onEdit(chapter)}
      className="w-full text-left flex items-center gap-4 py-3.5 px-1 border-b border-border-soft last:border-0 hover:bg-surface-hover -mx-1 rounded-lg transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium truncate">{chapter.name}</p>
          <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: masteryColor(chapter.mastery) }}>
            {chapter.mastery}%
          </span>
        </div>
        <ProgressBar value={chapter.mastery} color={masteryColor(chapter.mastery)} className="mt-2" />
        <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
          <span className="flex items-center gap-1" title={difficultyLevel(chapter.difficulty).description}>
            {difficultyLevel(chapter.difficulty).label}
            <span className="inline-flex gap-0.5 ml-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: i <= chapter.difficulty ? "var(--foreground)" : "var(--border)" }}
                />
              ))}
            </span>
          </span>
          <span>·</span>
          <span>Revu {relativePastLabel(chapter.lastReviewedAt)}</span>
          <span>·</span>
          <span>Prochaine révision {relativeDayLabel(nextReviewDate(chapter))}</span>
          <span>·</span>
          <span>{chapter.sessionsCount} séance{chapter.sessionsCount > 1 ? "s" : ""}</span>
        </div>
        {next && (
          <div className="mt-2">
            <Badge tone={daysUntilTone(next.date)}>
              {(() => {
                const Icon = KIND_ICON[next.kind];
                return <Icon size={11} />;
              })()}
              {KIND_LABEL[next.kind]} {relativeDayLabel(next.date)}
              {linked.length > 1 && ` · +${linked.length - 1} autre${linked.length > 2 ? "s" : ""}`}
            </Badge>
          </div>
        )}
      </div>
    </button>
  );
}
