"use client";

import { Sparkles } from "lucide-react";
import type { StudySession } from "@/types";
import { SessionCard } from "@/components/session/SessionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GenerateButton } from "@/components/planning/GenerateButton";

export function EveningPlan({
  sessions,
  onStart,
}: {
  sessions: StudySession[];
  onStart: (session: StudySession) => void;
}) {
  return (
    <div className="animate-fade-in-up [animation-delay:80ms]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Planning de la soirée</h2>
        <GenerateButton />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aucune session prévue aujourd'hui"
          description="Lance la génération pour que PrépaPilot te propose automatiquement quoi réviser ce soir."
          action={<GenerateButton variant="primary" size="md" />}
        />
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} onStart={onStart} />
          ))}
        </div>
      )}
    </div>
  );
}
