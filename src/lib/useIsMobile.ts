"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `md` breakpoint (768px) used everywhere else for the sidebar/nav switch.
const QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false; // resolved to the real value on the client right after mount
}

/**
 * Reactive viewport check (not just CSS `hidden md:...`) for cases where a component
 * needs to know which layout is actually active — e.g. the Planning page, where the
 * desktop and mobile views mount two different sets of drag-handling DOM refs and can't
 * both exist at once without them colliding.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
