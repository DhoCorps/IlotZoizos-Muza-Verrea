'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Volume2, VolumeX, Sparkles, Network, Shield 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Constellation3D from '@/components/observatory/Constellation3D';
import RegistreDesEchos from '@/components/observatory/RegistreDesEchos';
import ResonanceDrawer from '@/components/resonance/ResonanceDrawer';

// Fragments philosophiques et littéraires du corpus pour le Mode Manifeste / Poétique
const PHILOSOPHICAL_FRAGMENTS = [
  "L'esprit est une telle nature qu'il perçoit les choses sous une certaine forme d'éternité. — Spinoza",
  "Toute notre connaissance commence par les sens, puis remonte à l'entendement, et finit par la raison. — Kant",
  "La raison est, et ne doit être que l'esclave des passions. — Hume",
  "Ce qui est rationnel est réel ; et ce qui est réel est rationnel. — Hegel",
  "La liberté est la reconnaissance de la nécessité. — Spinoza"
];

export default function LetrInDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string; locale: string }> | { slug: string; locale: string } 
}) {
  // 🪡 Résolution sécurisée de params (compatible Promise et Objet simple pour les tests)
  const [slug, setSlug] = useState<string>(() => {
    return (params as any)?.slug || '';
  });

  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      if (resolved?.slug) {
        setSlug(resolved.slug);
      }
    });
  }, [params]);

  // États de la liseuse et du mode manifeste
  const [testText, setTestText] = useState('ABCQRSTUVWXYZ 0123456789');
  const [isPoeticMode, setIsPoeticMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isResonanceOpen, setIsResonanceOpen] = useState(false);

  // 🌀 Requête pour récupérer les détails de la police via l'API unifiée
  const { data: font, isLoading, error } = useQuery({
    queryKey: ['lettrin-font-detail', slug],
    queryFn: async () => {
      const res = await fetch(`/api/letrin/sprites/${slug}`);
      if (!res.ok) throw new Error("Impossible d'invoquer cette police depuis la Silice.");
      return await res.json();
    },
    enabled: !!slug
  });

  // 🌀 Requête pour la Constellation Neo4j (Graphe d'usages)
  const { data: constellationGraph } = useQuery({
    queryKey: ['lettrin-constellation', slug],
    queryFn: async () => {
      const res = await fetch(`/api/letrin/sprites/${slug}/constellation`);
      if (!res.ok) return { nodes: [], links: [] };
      return await res.json();
    },
    enabled: !!font && !!slug
  });

  const togglePoeticMode = () => {
    if (!isPoeticMode) {
      const randomFragment = PHILOSOPHICAL_FRAGMENTS[Math.floor(Math.random() * PHILOSOPHICAL_FRAGMENTS.length)];
      setTestText(randomFragment);
    } else {
      setTestText('ABCQRSTUVWXYZ 0123456789');
    }
    setIsPoeticMode(!isPoeticMode);
  };

  if (!slug || isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center font-mono text-slate-400">Invocation de la matrice en cours...</div>;
  }

  if (error || !font) {
    return (
      <div className="space-y-6 text-center py-20">
        <h2 className="text-xl font-mono text-red-400">Anomalie : Police introuvable dans le Nexus.</h2>
        <Link href="/letrinSprite" className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 bg-white/5 px-4 py-2 rounded-xl">
          <ArrowLeft size={14} /> Retourner à la Forge
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500">
      
      {/* 🧭 NAVIGATION & EN-TÊTE */}
      <div className="flex items-center justify-between">
        <Link href="/letrinSprite" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono flex items-center gap-2 transition-all">
          <ArrowLeft size={14} /> Catalogue
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsResonanceOpen(true)}
            className="px-4 py-2 bg-[#E5484D]/20 border border-[#E5484D]/40 text-[#E5484D] hover:bg-[#E5484D]/30 rounded-xl text-xs font-mono flex items-center gap-2 transition-all"
          >
            <Sparkles size={14} /> Fréquence & Résonance
          </button>
        </div>
      </div>

      {/* 🏛️ VITRINE PUBLIQUE DE LA POLICE */}
      <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">
                {font.category || 'LINEALE'}
              </span>
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-[10px] font-mono text-purple-300">
                🔮 {font.frequencyHz || 432} Hz
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase text-white tracking-tight">{font.name}</h1>
            <p className="text-xs font-mono text-slate-400">Sceau SHA-256 : <span className="text-slate-200">{font.digitalSignature || 'Vérifié'}</span></p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-3 rounded-xl border ${isMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
              title="Activer/Couper l'ancrage sonore"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* 📖 LISEUSE DE TEST & MODE MANIFESTE */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase text-slate-400">Liseuse interactive des glyphes</label>
            <button 
              onClick={togglePoeticMode}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase font-bold transition-all flex items-center gap-1.5 ${isPoeticMode ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              <Sparkles size={12} /> Mode Manifeste / Poétique
            </button>
          </div>

          <input 
            type="text" 
            value={testText} 
            onChange={(e) => setTestText(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-2xl md:text-3xl text-white outline-none focus:border-[#E5484D] transition-colors"
            style={{ fontFamily: `'${font.name}', sans-serif` }}
            placeholder="Tape ton texte ici..."
          />
        </div>
      </div>

      {/* 🌌 CONSTELLATION 3D (Neo4j Graph) */}
      <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Network size={16} className="text-[#E5484D]" />
          <h2 className="text-sm font-bold uppercase tracking-widest font-mono">Constellation Graphe (Usages & Liens)</h2>
        </div>
        <div className="w-full h-[400px] bg-black/60 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
          <Constellation3D 
            nodes={constellationGraph?.nodes || [{ id: font.uid || font._id, name: font.name, type: 'FONT' }]} 
            links={constellationGraph?.links || []} 
          />
        </div>
      </div>

      {/* 🛡️ BANNIÈRE DE COPYRIGHT & SOUVERAINETÉ */}
      <div className="p-6 bg-blue-950/20 border border-blue-500/20 rounded-3xl flex items-center gap-4">
        <Shield className="w-8 h-8 text-blue-400 shrink-0" />
        <div className="space-y-1 text-xs font-mono">
          <h4 className="font-bold text-blue-300 uppercase tracking-wider">Souveraineté et Propriété Intellectuelle</h4>
          <p className="text-slate-400">Cette typographie est protégée par un sceau cryptographique d'antériorité. Licence : {font.copyrightMetadata?.license || 'MIT / Libre Canopée'}. Exclusivité Îlot Zoizos : {font.copyrightMetadata?.isExclusiveIlot ? 'Oui' : 'Non'}.</p>
        </div>
      </div>

      {/* 💬 ÉCHOS REMARQUABLES & COMMUNAUTÉ */}
      <div className="space-y-6 pt-6 border-t border-white/5">
        <h2 className="text-lg font-black uppercase tracking-tight text-white">Échos Remarquables sur la Création</h2>
        <RegistreDesEchos comments={font.comments || font.echos || []} />
      </div>

      {/* 🌀 TIROIR DE RÉSONANCE */}
      <ResonanceDrawer 
        isOpen={isResonanceOpen} 
        onClose={() => setIsResonanceOpen(false)} 
        targetUid={font.authorUid}
        entityId={font.uid || font._id}
      />
    </div>
  );
}