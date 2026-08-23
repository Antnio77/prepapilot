"use client";

import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store/useAppStore";
import { cn } from "@/lib/utils";

type Status = "idle" | "spinning" | "done";

/** Generation itself is instant — this fakes a beat of "working…" so the click feels real. */
export function GenerateButton({
  size = "sm",
  variant = "secondary",
  className,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const runGeneration = useAppStore((s) => s.runGeneration);
  const lastGeneratedAt = useAppStore((s) => s.lastGeneratedAt);
  const [status, setStatus] = useState<Status>("idle");

  function handleClick() {
    if (status !== "idle") return;
    setStatus("spinning");
    window.setTimeout(() => {
      runGeneration();
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1100);
    }, 450);
  }

  const iconSize = size === "sm" ? 13 : 15;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={status !== "idle"}
      className={cn("disabled:opacity-100 transition-colors", status === "done" && "!bg-success-soft !text-success", className)}
    >
      {status === "done" ? (
        <Check size={iconSize} className="animate-pop-in" />
      ) : (
        <RefreshCw size={iconSize} className={cn(status === "spinning" && "animate-spin")} />
      )}
      {status === "done" ? "Généré !" : status === "spinning" ? "Génération…" : lastGeneratedAt ? "Régénérer" : "Générer mon planning"}
    </Button>
  );
}
