"use client";

import { formatDateLong } from "@/lib/utils";
import { todayISO } from "@/lib/utils";
import { RemindersToggle } from "@/components/reminders/RemindersToggle";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function TodayHeader() {
  const date = formatDateLong(todayISO());
  return (
    <div className="flex items-start justify-between gap-3 animate-fade-in-up">
      <div>
        <p className="text-sm text-muted capitalize">{date}</p>
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight mt-1">
          {greeting()}. Voici ton plan du jour.
        </h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* The sidebar's switch is desktop-only, so mirror it here for phones. */}
        <span className="md:hidden">
          <ThemeToggle compact />
        </span>
        <AccountMenu />
        <RemindersToggle />
      </div>
    </div>
  );
}
