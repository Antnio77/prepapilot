"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";

export default function LoginPage() {
  const router = useRouter();
  const resetDemoData = useAppStore((s) => s.resetDemoData);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Compte créé. Vérifie tes emails si une confirmation est requise, puis connecte-toi.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-11 w-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-3">
            <GraduationCap size={22} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">PrépaPilot</h1>
          <p className="text-sm text-muted mt-1 text-center">Ton planning de révisions, généré pour toi.</p>
        </div>

        <Card className="p-6">
          {!isSupabaseConfigured ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted">
                L&apos;authentification Supabase n&apos;est pas configurée sur cet environnement. Tu peux utiliser PrépaPilot
                directement — tes données restent stockées sur cet appareil.
              </p>
              <Link href="/">
                <Button className="w-full">Continuer</Button>
              </Link>
              <button
                onClick={() => {
                  resetDemoData();
                  router.push("/");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Réinitialiser mes données
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-5 bg-surface-hover rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 h-8 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${mode === "signin" ? "bg-surface shadow-sm" : "text-muted"}`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 h-8 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${mode === "signup" ? "bg-surface shadow-sm" : "text-muted"}`}
                >
                  Inscription
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-xs text-danger">{error}</p>}
                {message && <p className="text-xs text-success">{message}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {mode === "signin" ? <LogIn size={15} /> : <UserPlus size={15} />}
                  {loading ? "Un instant…" : mode === "signin" ? "Se connecter" : "Créer un compte"}
                </Button>
              </form>

              <Link href="/" className="block text-center text-xs text-muted mt-4 hover:text-foreground transition-colors">
                Continuer sans compte (données locales)
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
