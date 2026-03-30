'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation'; 
import Link from 'next/link';

// --- LE COMPOSANT FORMULAIRE ---
function LoginForm() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const isNewlyRegistered = searchParams.get('registered') === 'true';
  
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
      setError("L'oiseau n'a pas été reconnu... Vérifie tes accès.");
      setLoading(false);
    } else {
      // ✅ Redirection explicite vers la zone i18n
      router.push('/fr/dashboard'); 
      router.refresh(); 
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900/50 p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/10">
      
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Retour au Nid</h2>
        <p className="text-slate-400 text-sm">Identifie-toi pour accéder à la matrice.</p>
      </div>
      
      {isNewlyRegistered && (
        <div className="mb-6 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 border border-emerald-500/20 text-center font-medium">
          Ton œuf a éclos avec succès ! Connecte-toi pour prendre ton envol.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email de l'oiseau</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
            placeholder="geo@ilot.com"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-300">Mot de passe secret</label>
            <Link href="/auth/forgot-password" disable-nprogress="true" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              Clé perdue ?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 mt-2 rounded-lg text-white font-bold transition-all shadow-lg ${
            loading 
              ? 'bg-slate-700 cursor-not-allowed opacity-50' 
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
          }`}
        >
          {loading ? 'Vérification dans la canopée...' : 'Entrer dans l\'Îlot'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500 border-t border-slate-800 pt-6">
        Nouveau dans la volée ?{' '}
        <Link href="/auth/register" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
          Créer un profil
        </Link>
      </div>
    </div>
  );
}

// --- LA PAGE EXPORTÉE (Unique) ---
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Suspense fallback={
        <div className="text-slate-500 italic">
          Chargement de la porte d'accès...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}