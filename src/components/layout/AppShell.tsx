"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/useAppStore";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ReminderEngine } from "@/components/reminders/ReminderEngine";
import { GraduationCap } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const pathname = usePathname();

  if (pathname === "/login") {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  if (!hydrated) {
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
