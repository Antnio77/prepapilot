"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { useSessionTimerEngine } from "@/lib/session/useSessionTimerEngine";
import { SessionTimer } from "./SessionTimer";
import { FloatingTimerBar } from "./FloatingTimerBar";

/**
 * Mounted once in AppShell, outside the routed page content, so it survives navigation.
 * Keyed by the active session's id: starting a new session mounts a fresh instance (so it
 * naturally starts expanded with a clean countdown), while navigating between pages doesn't
 * change that key, so the same instance — and its ticking state — just keeps running.
 */
export function GlobalSessionTimer() {
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  if (!activeSessionId) return null;
  return <SessionTimerHost key={activeSessionId} />;
}

function SessionTimerHost() {
  const engine = useSessionTimerEngine();
  const [expanded, setExpanded] = useState(true);

  if (!engine.session) return null;

  return expanded ? (
    <SessionTimer engine={engine} onCollapse={() => setExpanded(false)} />
  ) : (
    <FloatingTimerBar engine={engine} onExpand={() => setExpanded(true)} />
  );
}
