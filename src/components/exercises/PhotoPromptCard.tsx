"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { PHOTO_PROMPT } from "@/lib/exercisePrompt";
import { cn } from "@/lib/utils";

/**
 * Hands the student the prompt to pair with a photo of an exercise.
 *
 * Collapsed by default: it is a one-off aid, not something to read every visit. A failed copy
 * (clipboard blocked, insecure context) opens the prompt instead of silently doing nothing, so
 * there is always a way to get the text out.
 */
export function PhotoPromptCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(PHOTO_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setOpen(true); // fall back to letting them select it by hand
    }
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Sparkles size={15} className="text-accent shrink-0" />
        <p className="text-[13px] text-muted flex-1 min-w-[12rem]">
          Envoie la photo d&apos;un exercice à une IA avec ce prompt : elle te renvoie l&apos;énoncé et la correction,
          prêts à coller.
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={copy}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
              copied ? "bg-success-soft text-success" : "bg-accent text-accent-foreground hover:opacity-90"
            )}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copié" : "Copier le prompt"}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Masquer le prompt" : "Voir le prompt"}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        // Plain <pre>, never MathText: the prompt's own "$...$" examples must stay literal text.
        <pre className="mt-3 rounded-lg bg-background border border-border-soft p-3 text-[12px] leading-relaxed text-muted whitespace-pre-wrap break-words font-mono">
          {PHOTO_PROMPT}
        </pre>
      )}
    </div>
  );
}
