'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // On envoie les données à ta VRAIE route API (/api/auth/register)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      router.push('/fr/auth/login?registered=true');
    } else {
      const data = await res.json();
      setError(data.error || 'Erreur lors de la fondation');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="text-red-500">{error}</div>}
      <input name="username" placeholder="Pseudo" className="bio-input" required />
      <input name="email" type="email" placeholder="Email" className="bio-input" required />
      <input name="password" type="password" placeholder="Mot de passe" className="bio-input" required />
      <input name="confirmPassword" type="password" placeholder="Confirmer mot de passe" className="bio-input" required />
      <button type="submit" className="bg-[#E5484D] text-white p-2 rounded">Rejoindre l'Îlot</button>
    </form>
  );
}