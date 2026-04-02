'use client';

import React, { useState } from 'react';
import { useRouter, Link } from '../../../../navigation'; 
import { useTranslations } from 'next-intl';
import { useVibe } from '../../../../context/VibeContext';
import LoadingZoizos from '../../../../components/ui/LoadingZoizos'; 

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter(); 
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
      return setError("Les chants de sécurité ne correspondent pas.");
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

      if (res.ok) {
        // Redirection vers le login avec le signal de succès
        router.push('/auth/login?registered=true');
      } else {
        const data = await res.json();
        setError(data.message || "La création du nid a échoué.");
      }
    } catch (err) {
      setError("Une perturbation dans la matrice a empêché l'éclosion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bio-card p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Nouveau Profil</h1>
          <p className="text-slate-400">Prépare ton nid dans l'Îlot Zoizos</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-[#E5484D]/30 text-[#E5484D] text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom d'oiseau (Username)</label>
            <input
              name="username"
              type="text"
              required
              className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Chant de sécurité</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmation du chant</label>
            <input
              name="confirmPassword"
              type="password"
              required
              className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 mt-4 rounded-xl text-white font-bold transition-all shadow-lg ${
              isLoading 
                ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                : 'bg-[#E5484D] hover:bg-[#E5484D]/80 shadow-[#E5484D]/10'
            }`}
          >
            {isLoading ? "Éclosion en cours..." : "Prendre son envol"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 border-t border-white/5 pt-6">
          Déjà un nid ?{' '}
          <Link href="/auth/login" className="text-[#E5484D] font-medium hover:underline transition-colors">
            S'identifier
          </Link>
        </div>
      </div>
    </div>
  );
}