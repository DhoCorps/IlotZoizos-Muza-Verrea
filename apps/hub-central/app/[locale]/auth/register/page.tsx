'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ pseudo: '', email: '', password: '', frequenceHEX: '#2F4F4F' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) router.push('/auth/login?status=franchi');
      else setError("L'Îlot repousse cette fréquence.");
    } catch {
      setError("Interférence réseau.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="text-red-500 text-sm text-center border border-red-900/50 p-2">{error}</div>}
      
      <input 
        type="text" placeholder="Alias (Le nom murmuré)" required
        className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded focus:border-gray-500 outline-none transition-colors"
        onChange={e => setFormData({...formData, pseudo: e.target.value})}
      />
      
      {/* LE COLOR PICKER (L'Impulsion) */}
      <div className="flex flex-col items-center space-y-2 p-4 border border-gray-800 rounded bg-gray-900/30">
        <label className="text-sm text-gray-400">Choisis ta fréquence initiale</label>
        <div className="flex items-center space-x-4">
          <input 
            type="color" 
            value={formData.frequenceHEX}
            onChange={e => setFormData({...formData, frequenceHEX: e.target.value})}
            className="w-16 h-16 rounded cursor-pointer border-none bg-transparent"
          />
          <span className="text-xs uppercase" style={{ color: formData.frequenceHEX }}>
            {formData.frequenceHEX}
          </span>
        </div>
      </div>

      <input 
        type="email" placeholder="Email (L'ancre secrète)" required
        className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded focus:border-gray-500 outline-none"
        onChange={e => setFormData({...formData, email: e.target.value})}
      />
      <input 
        type="password" placeholder="Le Sceau (Mot de passe)" required
        className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded focus:border-gray-500 outline-none"
        onChange={e => setFormData({...formData, password: e.target.value})}
      />
      
      <button type="submit" className="w-full p-3 bg-white/10 hover:bg-white/20 text-white rounded transition-all duration-300 tracking-widest">
        FRANCHIR LA PORTE
      </button>
    </form>
  );
}