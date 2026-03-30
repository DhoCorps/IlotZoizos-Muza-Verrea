'use client';

import { useState, useEffect, Suspense } from "react";
// 🛑 Outil natif Next.js (parfait pour lire ?token=...)
import { useSearchParams } from "next/navigation";
// 🟢 Routeur magique de next-intl pour garder la langue
import { useRouter } from "../../../../navigation"; 

import { useTranslations } from "next-intl";

function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter(); 
  const searchParams = useSearchParams(); 
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Le jeton de récupération est manquant ou invalide.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      return setMessage("Les mots de passe ne correspondent pas.");
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
         setStatus("error");
         setMessage("Le forgeage a échoué.");
         return;
      }

      setStatus("success");
      setMessage("Votre clé a été forgée avec succès !");
      
      // ✅ Redirection dynamique vers la page de connexion après 2 secondes
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);

    } catch (error) {
       setStatus("error");
       setMessage("Erreur lors de la communication avec le nid.");
    }
  };

  // 🛠️ LA PARTIE QUI AVAIT DISPARU : L'interface utilisateur reconstruite !
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/50 p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 transition-all duration-500">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Forger une nouvelle clé</h1>
          <p className="mt-2 text-slate-400">Entrez votre nouveau mot de passe secret.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className={`rounded-lg p-3 text-sm text-center border ${
              status === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              disabled={status === "loading" || !token}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmation</label>
            <input
              type="password"
              required
              disabled={status === "loading" || !token}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !token}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 mt-4 rounded-lg transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
          >
            {status === "loading" ? "Forgeage en cours..." : "Valider la nouvelle clé"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. L'export par défaut : Il ne sert qu'à emballer le formulaire dans un Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh] text-slate-500 italic">
        Initialisation de la forge...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}