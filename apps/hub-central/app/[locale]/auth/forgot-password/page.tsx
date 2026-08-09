// apps/hub-central/app/[locale]/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { Link } from '@/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  // 🌀 SUTURE REACT QUERY : Mutation pour le signal de détresse
  const forgotPasswordMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const res = await fetch('/api/auth/forgot-password', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }) 
      });
      if (!res.ok) throw new Error("Échec de l'émission du signal");
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      toast.success("✨ Signal de détresse émis dans la canopée.");
    },
    onError: (error: any) => {
      console.error("Perturbation lors de l'envoi de la fusée", error);
      toast.error("🔥 Perturbation lors de l'envoi de la fusée.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bio-card p-8">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Signal de détresse</h1>
          <p className="text-slate-400">Retrouve ton chemin vers l'Îlot Zoizos</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="email">
                Email de l'oiseau perdu
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
                placeholder="oiseau@ilot.zoizos"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className={`w-full py-3 px-4 mt-2 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                forgotPasswordMutation.isPending 
                  ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                  : 'bg-[#E5484D] hover:bg-[#E5484D]/80 shadow-[#E5484D]/10'
              }`}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Allumage de la fusée...
                </>
              ) : (
                "Lancer l'appel"
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 animate-in fade-in duration-500">
            <div className="p-4 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/20 text-[#E5484D] text-sm">
              <span className="block mb-2 text-2xl">✨</span>
              Si cet oiseau existe, il a reçu un message dans ses plumes. Surveille ton nid (et tes spams).
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-500 border-t border-white/5 pt-6">
          Mémoire retrouvée ?{' '}
          <Link href="/auth/login" className="text-[#E5484D] font-medium hover:underline transition-colors">
            Retourner au SAS
          </Link>
        </div>

      </div>
    </div>
  );
}