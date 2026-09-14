"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAppStore } from "@/lib/store/useAppStore";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./client";
import { pullState, pushState } from "./sync";

export type SyncStatus = "disabled" | "checking" | "signed-out" | "synced" | "error";

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
  const claimLocalFor = useAppStore((s) => s.claimLocalFor);
  const resetLocalFor = useAppStore((s) => s.resetLocalFor);
  const userIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    async function reconcile(userId: string) {
      try {
        const remote = await pullState(supabase!, userId);
        if (cancelled) return;

        if (remote && remote.subjects.length > 0) {
          hydrateFromRemote(remote, userId);
        } else {
          // Nothing stored for this account yet. Seeding it from what's on this device is only
          // right when that data isn't someone else's: localStorage is per-browser, so after a
          // logout and a different login it still holds the previous account's work, and
          // pushing it here would hand that account's entire profile to this one for good.
          const owner = useAppStore.getState().syncOwnerId;
          if (owner !== null && owner !== userId) {
            resetLocalFor(userId);
          } else {
            claimLocalFor(userId);
          }
          if (cancelled) return;
          await pushState(supabase!, userId, useAppStore.getState());
        }
        if (cancelled) return;
        readyRef.current = true;
        setStatus("synced");
      } catch (err) {
        // A failed reconcile used to escape as an unhandled rejection, leaving the status on
        // "checking" for ever — and since the app shell blocks on that, one rejected request
        // (a table the schema hasn't created yet, an offline moment) locked the whole app
        // behind its loading screen. Losing sync must never cost access to your own data.
        if (cancelled) return;
        console.error("[PrépaPilot] synchronisation impossible", err);
        // Failing to reach the cloud is no reason to show this account someone else's work:
        // if what's on the device belongs to another login, clear it rather than display it.
        if (useAppStore.getState().syncOwnerId !== userId) resetLocalFor(userId);
        // Deliberately leaves readyRef false: with the remote state unknown, letting the
        // debounced push run would risk overwriting good remote data with a stale snapshot.
        readyRef.current = false;
        setStatus("error");
      }
    }

    function onAuthChange(userId: string | null) {
      const changed = userIdRef.current !== userId;
      const previousUserId = userIdRef.current;
      userIdRef.current = userId;
      if (!userId) {
        // Stamp who the data left on this device belongs to. Installs predating syncOwnerId
        // carry null, and a null owner reads as "unclaimed" — which is what lets it be handed
        // to whoever signs in next. Logging out is the moment we still know the answer.
        if (previousUserId) claimLocalFor(previousUserId);
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
