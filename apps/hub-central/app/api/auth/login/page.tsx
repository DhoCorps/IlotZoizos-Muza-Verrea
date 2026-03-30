'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useVibe } from '../../../../context/VibeContext';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { mode } = useVibe();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Identifiants invalides ou oiseau inconnu.');
      setIsLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      {/* Carte Glassmorphism avec bordure réactive à la Vibe */}
      <div className={`w-full max-w-md rounded-2xl border bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-500 ${
        mode === 'storm' ? 'border-red-500/50 shadow-red-500/20' : 'border-emerald-500/30 shadow-emerald-500/10'
      } shadow-2xl`}>
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t('welcomeBack') || "Retour au Nid"}
          </h1>
          <p className="mt-2 text-slate-400">
            {t('loginSubtitle') || "Identifie-toi pour synchroniser tes fragments."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="oiseau@ilot.zoizos"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-lg p-3 font-bold text-white transition-all ${
              isLoading 
                ? 'bg-slate-700 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isLoading ? "Vérification..." : "Prendre son envol"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Mot de passe oublié ? <span className="text-emerald-400 cursor-pointer hover:underline">Appeler à l'aide</span></p>
        </div>
      </div>
    </div>
  );
}