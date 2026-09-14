"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import { useCloudSync } from "@/lib/supabase/useCloudSync";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ReminderEngine } from "@/components/reminders/ReminderEngine";
import { GlobalSessionTimer } from "@/components/session/GlobalSessionTimer";
import { GraduationCap } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  // No-ops when Supabase isn't configured; otherwise pulls/pushes the account's data so
  // the same login sees the same plan on every device instead of being stuck per-browser.
  const { status: syncStatus, error: syncError } = useCloudSync();

  useEffect(() => {
    if (isSupabaseConfigured && syncStatus === "signed-out" && pathname !== "/login") {
      router.replace("/login");
    }
  }, [syncStatus, pathname, router]);

  if (pathname === "/login") {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  const waitingOnAccount = isSupabaseConfigured && (syncStatus === "checking" || syncStatus === "signed-out");

  if (!hydrated || waitingOnAccount) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center animate-pulse">
            <GraduationCap size={20} />
          </div>
          <p className="text-sm text-muted">Chargement de PrépaPilot…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <ReminderEngine />
      <Sidebar />
      <div className="md:pl-64">
        {syncStatus === "error" && (
          // The app is usable offline, so it stays open — but silently pretending the cloud is
          // fine would let changes pile up on one device and look synced when they aren't.
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4">
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
              <p>Synchronisation indisponible — tes modifications restent sur cet appareil pour l&apos;instant.</p>
              {syncError && (
                // The cause, not just the symptom: on a phone there's no console to go and read,
                // and "which table is missing" is the whole answer to why sync won't start.
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-[12px] opacity-80">Voir la cause</summary>
                  <p className="mt-1.5 font-mono text-[11px] leading-relaxed break-words opacity-90">{syncError}</p>
                </details>
              )}
            </div>
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 md:pb-16 pt-6 md:pt-8">{children}</main>
      </div>
      <MobileNav />
      <GlobalSessionTimer />
    </div>
  );
}
