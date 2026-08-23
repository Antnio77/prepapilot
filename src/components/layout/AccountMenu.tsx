"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseUserEmail } from "@/lib/supabase/useSupabaseUser";

/** Account status + sign-out, reachable from anywhere (unlike the sidebar, hidden on mobile). */
export function AccountMenu() {
  const router = useRouter();
  const email = useSupabaseUserEmail();
  const [open, setOpen] = useState(false);

  if (!isSupabaseConfigured) return null;

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
        aria-label="Compte"
      >
        <User size={16} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Compte">
        <p className="text-sm text-foreground font-medium truncate">{email}</p>
        <p className="text-xs text-muted mt-1">Tes données sont synchronisées sur tous tes appareils via ce compte.</p>
        <Button variant="danger" className="w-full mt-5" onClick={handleSignOut}>
          <LogOut size={15} /> Se déconnecter
        </Button>
      </Modal>
    </>
  );
}
