"use client";

import { motion } from "framer-motion";
import { Check, Play, RotateCcw, Trash2, X } from "lucide-react";
import type { StudySession } from "@/types";
import { useAppStore } from "@/lib/store/useAppStore";
import { subjectColorVar } from "@/lib/subjects";
import { cn, formatMinutes } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const TYPE_LABELS: Record<string, string> = {
  cours: "Cours",
  exercices: "Exercices",
  preparation_ds: "Préparation DS",
  preparation_colle: "Préparation colle",
  devoir: "DM",
  revision: "Révision",
  relecture: "Relecture du cours",
};

const PRIORITY_TONE = {
  haute: "danger",
  moyenne: "warning",
  basse: "neutral",
} as const;

const PRIORITY_LABEL = {
  haute: "Priorité élevée",
  moyenne: "Priorité moyenne",
  basse: "Priorité basse",
} as const;

export function SessionCard({
  session,
  onStart,
  compact = false,
}: {
  session: StudySession;
  onStart?: (session: StudySession) => void;
  compact?: boolean;
}) {
  const subject = useAppStore((s) => s.subjects.find((sub) => sub.id === session.subjectId));
  const setSessionStatus = useAppStore((s) => s.setSessionStatus);
  const deleteStudySession = useAppStore((s) => s.deleteStudySession);

  if (session.type === "pause") {
    return (
      <div className="flex items-center gap-3 py-2 pl-4 opacity-70">
        <div className="h-px flex-1 border-t border-dashed border-border" />
        <span className="text-xs text-muted-foreground font-medium">
          Pause · {formatMinutes(session.durationMinutes)}
        </span>
        <div className="h-px flex-1 border-t border-dashed border-border" />
      </div>
    );
  }

  const color = subject ? subjectColorVar(subject.colorKey) : "var(--muted)";
  const isDone = session.status === "termine";
  const isIgnored = session.status === "ignore";
  const isActive = session.status === "en_cours";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex gap-4 rounded-2xl border border-border-soft bg-surface p-4 transition-colors",
        isDone && "opacity-60",
        isIgnored && "opacity-50"
      )}
    >
      <div className="w-1.5 shrink-0 rounded-full" style={{ background: color }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold" style={{ color }}>
                {subject?.name.toUpperCase() ?? "AUTRE"}
              </span>
              <span className="text-xs text-muted-foreground">{TYPE_LABELS[session.type]}</span>
            </div>
            <p className="text-[15px] font-medium text-foreground mt-0.5 truncate">{session.title}</p>
            {session.reason && !compact && (
              <p className="text-xs text-muted mt-1 truncate">{session.reason}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium tabular-nums">
              {session.startTime} → {session.endTime}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatMinutes(session.durationMinutes)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-2">
            {session.priority && !isDone && !isIgnored && (
              <Badge tone={PRIORITY_TONE[session.priority]}>{PRIORITY_LABEL[session.priority]}</Badge>
            )}
            {isDone && (
              <Badge tone="success">
                <Check size={12} /> Terminé
              </Badge>
            )}
            {isIgnored && <Badge tone="neutral">Ignorée</Badge>}
            {isActive && <Badge tone="accent">En cours</Badge>}
          </div>

          <div className="flex items-center gap-1.5">
            {(session.status === "a_faire" || session.status === "en_cours") && onStart && (
              <button
                onClick={() => onStart(session)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                {isActive ? "Reprendre" : "Commencer"}
              </button>
            )}
            {session.status === "a_faire" && (
              <>
                <button
                  onClick={() => setSessionStatus(session.id, "ignore")}
                  title="Ignorer et reprogrammer"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
                <button
                  onClick={() => deleteStudySession(session.id)}
                  title="Supprimer"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {isIgnored && (
              <button
                onClick={() => deleteStudySession(session.id, { reschedule: false })}
                title="Supprimer définitivement"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
            {isDone && (
              <button
                onClick={() => setSessionStatus(session.id, "a_faire")}
                title="Marquer à refaire"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
