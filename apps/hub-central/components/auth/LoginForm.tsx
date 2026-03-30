'use client'; // ⚡ Crucial pour l'interactivité du Nexus

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, AlertCircle } from 'lucide-react'; // Pour l'esthétique Bio-Tech

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🛡️ Gestion d'état locale pour la réactivité du bouton
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: credentials.email.toLowerCase().trim(), // 🕊️ Normalisation pour la Canopée
        password: credentials.password,
        redirect: false, 
      });

      if (result?.error) {
        // Personnalisation du message d'erreur selon le code retour
        setError("L'oiseau n'a pas été reconnu... Vérifie tes accès.");
        setLoading(false);
      } else {
        // Redirection propre via le router de Next.js
        router.push('/fr/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError("Une perturbation bloque l'accès au Nexus.");
      setLoading(false);
    }
  };

  // ✅ Validation simple pour activer le bouton
  const isInvalid = !credentials.email || credentials.password.length < 6;

  return (
    <div className="w-full max-w-md p-8 bg-slate-900/50 border border-emerald-500/30 rounded-2xl backdrop-blur-xl shadow-2xl nexus-card">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-6 text-center uppercase tracking-wider">
        Connexion à l'Îlot
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-emerald-400 mb-1">Email de l'oiseau</label>
          <input
            name="email"
            type="email"
            value={credentials.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
            placeholder="geo@ilot.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-400 mb-1">Mot de passe</label>
          <input
            name="password"
            type="password"
            value={credentials.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-medium text-center backdrop-blur-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isInvalid}
          className={`w-full py-4 rounded-lg text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
            loading || isInvalid
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-50' 
              : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-900/40 border border-emerald-500/50 active:scale-[0.98]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Vérification...</span>
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Entrer dans l'Îlot</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}