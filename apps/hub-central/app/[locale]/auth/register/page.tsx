// apps/hub-central/app/[locale]/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ pseudo: '', email: '', password: '', frequenceHEX: '#2F4F4F' });
  const [error, setError] = useState('');

  // 🌀 SUTURE REACT QUERY : Mutation pour l'enregistrement
  const registerMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("L'Îlot repousse cette fréquence.");
      return res.json();
    },
    onSuccess: () => {
      toast.success("✨ Nid fondé avec succès. Bienvenue dans la volière !");
      router.push('/auth/login?status=franchi');
    },
    onError: (err: any) => { // 🪡 Correction ici : onError au lieu de err
      setError(err.message || "Interférence réseau.");
      toast.error(`🔥 ${err.message || "Interférence réseau."}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-red-400 text-xs font-mono text-center border border-red-900/50 bg-red-500/10 p-3 rounded-xl">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-slate-400 uppercase">Alias</label>
        <input 
          type="text" 
          placeholder="Le nom murmuré..." 
          required
          className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
          onChange={e => setFormData({...formData, pseudo: e.target.value})}
        />
      </div>
      
      {/* LE COLOR PICKER (L'Impulsion) */}
      <div className="flex flex-col items-center space-y-2 p-4 border border-white/5 rounded-2xl bg-black/30">
        <label className="text-xs font-mono text-slate-400 uppercase">Choisis ta fréquence initiale</label>
        <div className="flex items-center space-x-4">
          <input 
            type="color" 
            value={formData.frequenceHEX}
            onChange={e => setFormData({...formData, frequenceHEX: e.target.value})}
            className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
          />
          <span className="text-xs font-mono font-bold uppercase" style={{ color: formData.frequenceHEX }}>
            {formData.frequenceHEX}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-slate-400 uppercase">Email</label>
        <input 
          type="email" 
          placeholder="L'ancre secrète..." 
          required
          className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
          onChange={e => setFormData({...formData, email: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-slate-400 uppercase">Mot de passe</label>
        <input 
          type="password" 
          placeholder="Le Sceau..." 
          required
          className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
          onChange={e => setFormData({...formData, password: e.target.value})}
        />
      </div>
      
      <button 
        type="submit" 
        disabled={registerMutation.isPending}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black uppercase text-xs rounded-xl transition-all duration-300 tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
      >
        {registerMutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sédimentation...
          </>
        ) : (
          "Franchir la Porte"
        )}
      </button>
    </form>
  );
}