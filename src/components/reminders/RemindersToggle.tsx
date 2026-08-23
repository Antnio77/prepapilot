"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

export function RemindersToggle() {
  const enabled = useAppStore((s) => s.remindersEnabled);
  const setEnabled = useAppStore((s) => s.setRemindersEnabled);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  const supported = typeof window !== "undefined" && "Notification" in window;

  async function handleToggle() {
    if (enabled) {
      setEnabled(false);
      return;
    }
    if (!supported) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setEnabled(true);
      setDenied(false);
    } else {
      setDenied(true);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "h-9 w-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0",
          enabled ? "bg-accent-soft border-accent/30 text-accent" : "border-border bg-surface text-muted hover:text-foreground"
        )}
        aria-label="Rappels"
      >
        {enabled ? <Bell size={16} /> : <BellOff size={16} />}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Rappels">
        <p className="text-sm text-muted">
          Reçois une notification quand une session de révision commence dans moins de 10 minutes, et un résumé quand
          une échéance tombe le jour même.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Ça ne fonctionne que pendant que PrépaPilot est ouvert dans un onglet — pas si le navigateur est fermé.
        </p>

        {!supported && (
          <p className="text-xs text-danger mt-3">Les notifications ne sont pas prises en charge par ce navigateur.</p>
        )}
        {denied && !enabled && (
          <p className="text-xs text-danger mt-3">
            Notifications refusées. Autorise-les dans les réglages de ton navigateur pour ce site, puis réessaie.
          </p>
        )}

        <div className="flex items-center justify-between mt-5 rounded-xl bg-surface-hover px-4 py-3">
          <span className="text-sm font-medium">Rappels {enabled ? "activés" : "désactivés"}</span>
          <button
            onClick={handleToggle}
            disabled={!supported}
            className={cn(
              "h-6 w-11 rounded-full relative transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              enabled ? "bg-accent" : "bg-border"
            )}
            aria-pressed={enabled}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                enabled ? "translate-x-[22px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="flex justify-end mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </Modal>
    </>
  );
}
