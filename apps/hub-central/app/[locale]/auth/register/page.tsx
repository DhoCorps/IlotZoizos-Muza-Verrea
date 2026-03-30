'use client';

import React, { useState } from 'react';
// 🟢 On importe le routeur et le Link magiques de next-intl
import { useRouter, Link } from '../../../../navigation'; 
import { useTranslations } from 'next-intl';
import { useVibe } from '../../../../context/VibeContext';
import LoadingZoizos from '../../../../components/ui/LoadingZoizos'; 

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter(); // 🪄 Ce routeur connaît la langue !
  const { mode } = useVibe();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Les clés ne correspondent pas.");
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      // ✅ Redirection dynamique vers la page de connexion, en gardant la langue !
      router.push('/auth/login?registered=true');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingZoizos message="Synchronisation avec le Graphe en cours..." />;
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-500 shadow-2xl ${
        mode === 'storm' ? 'border-red-500/50 shadow-red-500/20' : 'border-cyan-500/30 shadow-cyan-500/10'
      }`}>
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Rejoindre l'Îlot
          </h1>
          <p className="mt-2 text-slate-400">
            Crée ton identité unique dans le Nexus.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom d'oiseau</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Ex: Albatros_Bleu"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe secret</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmation</label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-lg p-3 font-bold text-white transition-all mt-4 ${
              isLoading 
                ? 'bg-slate-700 cursor-not-allowed' 
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20'
            }`}
          >
            {isLoading ? "Éclosion en cours..." : "Prendre son envol"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {/* 🟢 Remplacement de la balise <a> par notre Link i18n */}
          Déjà un compte ? <Link href="/auth/login" className="text-cyan-400 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}