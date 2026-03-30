'use client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    setSent(true);
  };

  return (
    <div className="p-8 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-4">Fusée de détresse</h2>
      {!sent ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-slate-400 text-sm">Entre ton email pour recevoir un lien de secours.</p>
          <input type="email" className="p-3 rounded bg-slate-800 text-white" placeholder="Ton email" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="bg-amber-600 p-3 rounded text-white font-bold">Envoyer l'appel</button>
        </form>
      ) : (
        <p className="text-emerald-400 italic">Si cet oiseau existe, il a reçu un message dans ses plumes.</p>
      )}
    </div>
  );
}