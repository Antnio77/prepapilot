"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAppStore } from "@/lib/store/useAppStore";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";
import { pullState, pushState } from "./sync";

export type SyncStatus = "disabled" | "checking" | "signed-out" | "synced";

const PUSH_DEBOUNCE_MS = 1500;

/**
 * Mirrors the local store to Supabase so the same account sees the same data on every
 * device: pulls the remote snapshot on sign-in (or seeds it from local data if this is a
 * brand-new account), then pushes a debounced full snapshot after any subsequent change.
 * No-ops entirely when Supabase isn't configured — the app stays local-only in that case.
 */
export function useCloudSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? "checking" : "disabled");
  const hydrateFromRemote = useAppStore((s) => s.hydrateFromRemote);
  const userIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    async function reconcile(userId: string) {
      const remote = await pullState(supabase!, userId);
      if (cancelled) return;
      if (remote && remote.subjects.length > 0) {
        hydrateFromRemote(remote);
      } else {
        await pushState(supabase!, userId, useAppStore.getState());
      }
      if (cancelled) return;
      readyRef.current = true;
      setStatus("synced");
    }

    function onAuthChange(userId: string | null) {
      const changed = userIdRef.current !== userId;
      userIdRef.current = userId;
      if (!userId) {
        readyRef.current = false;
        setStatus("signed-out");
        return;
      }
      if (!changed && readyRef.current) return;
      setStatus("checking");
      readyRef.current = false;
      reconcile(userId);
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => onAuthChange(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) =>
      onAuthChange(session?.user.id ?? null)
    );

    const unsubStore = useAppStore.subscribe(() => {
      if (!readyRef.current || !userIdRef.current) return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        const uid = userIdRef.current;
        if (!uid) return;
        pushState(supabase!, uid, useAppStore.getState()).catch(() => {});
      }, PUSH_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      unsubStore();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
