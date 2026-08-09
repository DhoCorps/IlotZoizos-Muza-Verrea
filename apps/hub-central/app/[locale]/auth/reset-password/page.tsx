// apps/hub-central/app/[locale]/auth/reset-password/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation'; 
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter(); 
  const searchParams = useSearchParams(); 
  const token = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Le signal de récupération est manquant ou altéré.");
    }
  }, [token]);

  // 🌀 SUTURE REACT QUERY : Mutation pour la réinitialisation du mot de passe
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "La mutation du chant a échoué.");
      }
      return res.json();
    },
    onSuccess: () => {
      setStatus("success");
      setMessage("Ton nouveau chant a été assimilé avec succès !");
      toast.success("✨ Chant de sécurité mis à jour.");
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    },
    onError: (error: any) => {
      setStatus("error");
      setMessage(error.message || "Perturbation dans la matrice de l'Îlot.");
      toast.error(`🔥 ${error.message || "Échec de la réinitialisation"}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Les chants de sécurité ne correspondent pas.");
      return;
    }

    setStatus("loading");
    setMessage("");
    resetPasswordMutation.mutate();
  };

  const isLoading = resetPasswordMutation.isPending || status === "loading";

  return (
    <div className="w-full max-w-md bio-card p-8">
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Renouveau</h1>
        <p className="text-slate-400">Forge ton nouveau chant de sécurité.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-sm text-center border ${
            status === 'success' 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-red-500/10 text-[#E5484D] border-[#E5484D]/30'
          }`}>
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nouveau chant</label>
          <input
            type="password"
            required
            disabled={isLoading || !token || status === "success"}
            className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Confirmation</label>
          <input
            type="password"
            required
            disabled={isLoading || !token || status === "success"}
            className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !token || status === "success"}
          className={`w-full py-3 px-4 mt-2 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
            isLoading || !token || status === "success"
              ? 'bg-slate-800 cursor-not-allowed opacity-50' 
              : 'bg-[#E5484D] hover:bg-[#E5484D]/80 shadow-[#E5484D]/10'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Assimilation en cours...
            </>
          ) : (
            "Valider le chant"
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="text-[#E5484D] font-mono animate-pulse text-sm">
        Initialisation du processus de mutation...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}