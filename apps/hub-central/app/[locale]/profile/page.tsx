'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [oiseau, setOiseau] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pour la démo : un simple éditeur de texte (JSON) pour le Sanctuaire
  // Plus tard, cela pourrait être une interface drag & drop pour le "Lego de l'Ego"
  const [sanctuaireEdit, setSanctuaireEdit] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          setOiseau(data);
          setSanctuaireEdit(JSON.stringify(data.sanctuaire, null, 2));
          setLoading(false);
        });
    }
  }, [session]);

  if (loading) return <div className="min-h-screen bg-black flex justify-center items-center text-gray-500">Résonance en cours...</div>;

  // LE CHÂTIMENT DE L'ANNEAU (La disparition du Balrog)
  // Si le système a verrouillé le profil à cause d'une entropie à zéro
  if (oiseau.frequenceHEX === '#000000' && oiseau.sanctuaire?.message_systeme) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center text-center p-8 border-[20px] border-black/90">
        <h1 className="text-red-900 text-4xl mb-4 font-serif">LA STRUCTURE S'EST EFFONDRÉE</h1>
        <p className="text-gray-600 max-w-md italic">"{oiseau.sanctuaire.message_systeme}"</p>
        <p className="text-gray-800 mt-8 text-xs">Le vide ne se remplit pas par effraction.</p>
      </div>
    );
  }

  // LE MODE GHOST (Le Gris Bleuté)
  if (oiseau.message_statut) {
    return (
      <div className="min-h-screen bg-[#2F4F4F] flex justify-center items-center text-white/50 blur-sm hover:blur-none transition-all duration-1000">
        <p>{oiseau.message_statut}</p>
      </div>
    );
  }

  // LE SANCTUAIRE STANDARD (Polymorphe)
  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* L'En-tête Vibratoire */}
        <div className="flex items-center space-x-6 pb-8 border-b border-gray-800">
          <div className="w-24 h-24 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ backgroundColor: oiseau.frequenceHEX, boxShadow: `0 0 40px ${oiseau.frequenceHEX}40` }}></div>
          <div>
            <h1 className="text-3xl font-bold tracking-wider text-white">{oiseau.pseudo}</h1>
            <p className="text-xs uppercase mt-2 opacity-60">Fréquence : {oiseau.frequenceHEX}</p>
          </div>
        </div>

        {/* L'Espace Polymorphe */}
        <div className="space-y-4">
          <h2 className="text-xl text-gray-500">LE SANCTUAIRE</h2>
          <p className="text-sm text-gray-600 italic">Écris ton mythe, définis ton elfe, ou pose ton silence. Format JSON libre.</p>
          
          <textarea 
            className="w-full h-64 bg-black/50 border border-gray-800 text-green-500/80 font-mono p-4 rounded focus:outline-none focus:border-gray-600 resize-y"
            value={sanctuaireEdit}
            onChange={(e) => setSanctuaireEdit(e.target.value)}
          />
          
          <button className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 border border-gray-700 rounded transition-colors">
            Muter la structure
          </button>
        </div>

      </div>
    </div>
  );
}