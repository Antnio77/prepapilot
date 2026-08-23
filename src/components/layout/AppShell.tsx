"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import { useCloudSync } from "@/lib/supabase/useCloudSync";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ReminderEngine } from "@/components/reminders/ReminderEngine";
import { GraduationCap } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  // No-ops when Supabase isn't configured; otherwise pulls/pushes the account's data so
  // the same login sees the same plan on every device instead of being stuck per-browser.
  const syncStatus = useCloudSync();

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
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 md:pb-16 pt-6 md:pt-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
