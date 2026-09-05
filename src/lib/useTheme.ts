"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/** Kept in sync with the inline pre-paint script in app/layout.tsx — change both together. */
export const THEME_STORAGE_KEY = "prepapilot-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // private mode / storage disabled: fall back to the OS preference
  }
}

/** No stored choice means "follow the OS", which is the default until the toggle is used. */
function resolveTheme(): Theme {
  return storedTheme() ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  // Another tab switching theme writes to localStorage; keep this one in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    mql.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot(): Theme {
  return "light"; // resolved to the real value on the client right after mount
}

/**
 * Current palette plus a switch for it. Reading through useSyncExternalStore (rather than
 * useState + useEffect) keeps the server and first client render consistent and lets an OS-level
 * change still come through while no explicit choice is stored.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, resolveTheme, getServerSnapshot);

  function setTheme(next: Theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable — the switch still applies for this session.
    }
    document.documentElement.dataset.theme = next;
    for (const listener of listeners) listener();
  }

  return { theme, toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark") };
}
