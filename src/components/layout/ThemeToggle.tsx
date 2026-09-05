"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";

/**
 * `compact` renders the icon-only square used in page headers on mobile, where the sidebar
 * (and so the full-width switch) isn't on screen.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Passer en thème clair" : "Passer en thème sombre";
  const Icon = isDark ? Sun : Moon;

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-soft bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
        aria-label={label}
        title={label}
      >
        <Icon size={16} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
      aria-label={label}
      title={label}
    >
      <span className="flex items-center gap-2.5 text-xs font-medium">
        <Icon size={15} />
        {isDark ? "Thème sombre" : "Thème clair"}
      </span>
      <span
        role="switch"
        aria-checked={isDark}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", isDark ? "bg-accent" : "bg-border")}
      >
        {/* Animates `left` rather than translate-x-*: those set `translate` via an unregistered
            custom property, which browsers don't interpolate reliably, so the knob stayed put and
            only the track colour changed. An explicit left also pins the knob independently of the
            static position, which the button's inherited text-align:center would otherwise shift.
            The shadow keeps the white knob legible against the pale off-state track in light mode. */}
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[left] duration-200",
            isDark ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
