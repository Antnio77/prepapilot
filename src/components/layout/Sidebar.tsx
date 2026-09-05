"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseUserEmail } from "@/lib/supabase/useSupabaseUser";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const email = useSupabaseUserEmail();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border-soft bg-surface/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-6 h-16 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
          <GraduationCap size={18} />
        </div>
        <span className="font-semibold tracking-tight text-[15px]">PrépaPilot</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              )}
            >
              <Icon size={17} strokeWidth={2.1} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border-soft space-y-2">
        <ThemeToggle />
        {isSupabaseConfigured && email ? (
          <div className="rounded-xl bg-surface-hover px-3 py-2.5">
            <p className="text-xs font-medium text-foreground truncate">{email}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted">Synchronisé sur tous tes appareils</p>
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <Link href="/login" className="block rounded-xl bg-surface-hover px-3 py-2.5 hover:bg-surface-hover/70 transition-colors">
            <p className="text-xs font-medium text-foreground">Stockage local</p>
            <p className="text-xs text-muted mt-0.5">Tes données restent sur cet appareil</p>
          </Link>
        )}
      </div>
    </aside>
  );
}
