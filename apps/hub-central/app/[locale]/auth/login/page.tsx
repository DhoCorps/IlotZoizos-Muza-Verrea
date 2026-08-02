'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation'; 
import { Link, useRouter } from '../../../../navigation'; // Utilisation de ta navigation i18n

/**
 * 🦅 FORMULAIRE DE CONNEXION DE L'ÎLOT
 * Ce composant est le sas d'entrée pour les oiseaux identifiés.
 */
function LoginForm() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const isNewlyRegistered = searchParams?.get('registered') === 'true';
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false, 
    });

    if (result?.error) {
      // Message d'erreur personnalisé selon ton lore
      setError("L'oiseau n'a pas été reconnu... Vérifie ton chant d'accès.");
      setLoading(false);
    } else {
      // ✅ Redirection fluide vers le Dashboard localisé
      router.push(`/tom-hat-toes`); 
      router.refresh(); 
    }
  };

  return (
    <div className="w-full max-w-md bio-card p-8"> {/* Utilisation de ta classe .bio-card */}
      <div className="mb-8 text-center">
        <h1 data-testid="auth-title" className="text-3xl font-bold tracking-tight text-white mb-2">Identification</h1>
        <p className="text-slate-400">Entre dans la matrice de l'Îlot Zoizos</p>
      </div>

      {isNewlyRegistered && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm text-center">
          Ton nid a été préparé avec succès. Tu peux maintenant t'identifier.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-[#E5484D]/30 text-[#E5484D] text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="email">
            Email de l'oiseau
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
            placeholder="oiseau@ilot.zoizos"
          />
        </div>

        <div>
          {/* 🪡 SUTURE UX : Le bouton de récupération intégré organiquement à côté du label */}
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-300" htmlFor="password">
              Chant de sécurité
            </label>
            <button 
              type="button" /* ⚠️ CRUCIAL : Empêche de déclencher le onSubmit du formulaire */
              onClick={() => router.push('/auth/forgot-password')} 
              className="text-xs text-[#E5484D] font-medium hover:underline transition-colors focus:outline-none"
            >
              Chant oublié ?
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-white outline-none focus:border-[#E5484D]/50 transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          data-testid="auth-submit"
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 mt-2 rounded-xl text-white font-bold transition-all shadow-lg ${
            loading 
              ? 'bg-slate-800 cursor-not-allowed opacity-50' 
              : 'bg-[#E5484D] hover:bg-[#E5484D]/80 shadow-[#E5484D]/10'
          }`} // Couleurs basées sur ton Rouge Organique
        >
          {loading ? 'Vérification dans la canopée...' : "Prendre son envol"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500 border-t border-white/5 pt-6">
        Nouveau dans la volée ?{' '}
        <Link href="/auth/register" className="text-[#E5484D] font-medium hover:underline transition-colors">
          Créer un profil
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-[#E5484D]">Initialisation du nid...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}