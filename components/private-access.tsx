"use client";
import { useEffect, useState } from "react";
import { House, ArrowRight, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";
export function PrivateAccess({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<
      "loading" | "local" | "allowed" | "login" | "denied"
    >("loading"),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(
      window.location.hostname,
    );
    if (local) {
      setAccess("local");
      return;
    }
    if (!supabase) {
      setAccess("denied");
      setMessage("Nosso espaço ainda está sendo preparado.");
      return;
    }
    async function check() {
      const { data, error } = await supabase!.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setAccess("login");
        return;
      }
      const { data: household, error: denied } =
        await supabase!.rpc("ensure_household");
      if (active) {
        setAccess(!denied && household ? "allowed" : "denied");
        if (denied)
          setMessage("Este acesso ainda não está liberado para nosso espaço.");
      }
    }
    void check().catch(() => {
      if (active) {
        setAccess("login");
        setMessage("Não conseguimos conectar agora. Tente novamente.");
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setAccess("loading");
      setTimeout(
        () =>
          void check().catch(() => {
            if (active) setAccess("login");
          }),
        0,
      );
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (access === "local" || access === "allowed") return children;
  return (
    <main className="private-entry">
      <div className="entry-card">
        <span className="entry-brand">
          <House size={23} /> nosso lar.
        </span>
        <span className="eyebrow">SÓ NÓS DOIS</span>
        <h1>Nosso lugar começa aqui.</h1>
        <p>Entre para continuar de onde paramos.</p>
        {access === "loading" ? (
          <p role="status">Abrindo nosso espaço…</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              setBusy(true);
              setMessage("");
              try {
                const { error } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                  options: {
                    shouldCreateUser: false,
                    emailRedirectTo: window.location.origin,
                  },
                });
                setMessage(
                  error
                    ? "Não conseguimos enviar o acesso. Confira seu e-mail ou tente novamente daqui a pouco."
                    : "Confira seu e-mail. Enviamos um link para entrar.",
                );
              } catch {
                setMessage("Não conseguimos conectar agora. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Seu e-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button className="primary" disabled={busy || !supabase}>
              {busy ? "Enviando…" : "Receber meu acesso"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
        {message && (
          <p className="entry-message" role="status">
            {message}
          </p>
        )}
        {access === "denied" && supabase && (
          <button
            className="text-button"
            onClick={() => supabase!.auth.signOut()}
          >
            Usar outro e-mail
          </button>
        )}
        <div className="entry-foot">
          <LockKeyhole size={14} />
          Um espaço reservado para nós.
        </div>
      </div>
    </main>
  );
}
