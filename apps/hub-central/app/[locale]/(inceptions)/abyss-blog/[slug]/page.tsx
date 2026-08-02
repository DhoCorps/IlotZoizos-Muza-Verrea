'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, ArrowLeft, Play, Pause, Music, Layers, 
  MessageCircle, Send, Calendar, User, Tag, ShieldCheck, ShoppingBag, Sparkles
} from 'lucide-react';

export default function AbyssBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [sujet, setSujet] = useState<any>(null);
  const [echoes, setEchoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingEcho, setSubmittingEcho] = useState(false);
  const [submittingEmoji, setSubmittingEmoji] = useState<string | null>(null);

  // 1. Récupération du Sujet et de ses Échos
  useEffect(() => {
    if (!slug) return;
    const fetchSujetAndEchoes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/sujets');
        const data = await res.json();
        // Extraction basée sur le SLUG et non plus l'UID
        const found = data.find((s: any) => s.slug === slug);
        
        if (found) {
          setSujet(found);
          const echoesRes = await fetch(`/api/resonance/echoes?targetUid=${found.uid}`);
          const echoesData = await echoesRes.json();
          if (Array.isArray(echoesData)) setEchoes(echoesData);
        }
      } catch (err) {
        console.error("🌊 Erreur lors de l'extraction du monologue :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSujetAndEchoes();
  }, [slug]);

  // Initialisation du lecteur audio si une piste est attachée
  useEffect(() => {
    if (sujet?.media?.audioTrackUrl) {
      const audio = new Audio(sujet.media.audioTrackUrl);
      audio.onended = () => setIsPlayingAudio(false);
      setAudioElement(audio);
      return () => {
        audio.pause();
      };
    }
  }, [sujet]);

  const toggleAudio = () => {
    if (!audioElement) return;
    if (isPlayingAudio) {
      audioElement.pause();
      setIsPlayingAudio(false);
    } else {
      audioElement.play();
      setIsPlayingAudio(true);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !sujet) return;

    try {
      setSubmittingEcho(true);
      const res = await fetch('/api/resonance/echoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid: sujet.uid,
          targetLabel: 'Sujet',
          echoType: 'TEXT',
          content: newComment.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEchoes(prev => [data.echo, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error("🔥 Impossible de sceller l'écho :", err);
    } finally {
      setSubmittingEcho(false);
    }
  };

  // ⚡ Fonction pour propager une vibration rapide (Emoji)
  const handleVibrateEmoji = async (emoji: string) => {
    if (!sujet) return;
    try {
      setSubmittingEmoji(emoji);
      const res = await fetch('/api/resonance/echoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid: sujet.uid,
          targetLabel: 'Sujet',
          echoType: 'EMOJI',
          content: emoji
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEchoes(prev => [data.echo || {
          uid: Date.now().toString(),
          targetUid: sujet.uid,
          targetLabel: 'Sujet',
          echoType: 'EMOJI',
          content: emoji,
          createdAt: new Date().toISOString()
        }, ...prev]);
      }
    } catch (err) {
      console.error("⚡ Erreur lors de la vibration :", err);
    } finally {
      setSubmittingEmoji(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#0A0D14]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
      </div>
    );
  }

  if (!sujet) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#0A0D14] text-slate-400 space-y-4">
        <p className="text-sm font-mono uppercase tracking-widest">Ce monologue s'est évaporé dans la brume.</p>
        <button 
          onClick={() => router.push('/abyss-blog')}
          className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Retourner à la Clairière
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      
      {/* 🧭 NAVIGATION DE RETOUR */}
      <button 
        onClick={() => router.push('/abyss-blog')}
        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
      >
        <ArrowLeft size={14} /> Revenir au Flux
      </button>

      {/* 📜 EN-TÊTE DU MONOLOGUE */}
      <article className="space-y-6 border-b border-white/5 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/20 uppercase tracking-widest">
              {sujet.category}
            </span>
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <Calendar size={12} /> {new Date(sujet.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* ⚡ BARRE DE VIBRATIONS RAPIDES (EMOJIS) */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1">
              <Sparkles size={10} className="text-[#E5484D]" /> Vibre :
            </span>
            {['<(:<', '🔥', '❤️', '🧠', '✨', '☕'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleVibrateEmoji(emoji)}
                disabled={submittingEmoji !== null}
                className="px-2 py-1 bg-white/5 hover:bg-[#E5484D]/20 border border-white/10 hover:border-[#E5484D]/40 rounded-xl text-xs transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                title={`Vibrer avec ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-100 leading-none">
          {sujet.title}
        </h1>

        {/* 🎵 LECTEUR AUDIO INTÉGRÉ */}
        {sujet.media?.audioTrackUrl && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Music size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Fréquence Audio Attachée</p>
                <p className="text-[10px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">{sujet.media.audioTrackUrl}</p>
              </div>
            </div>
            
            <button 
              onClick={toggleAudio}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all flex items-center gap-2 shrink-0"
            >
              {isPlayingAudio ? <><Pause size={14} /> Silence</> : <><Play size={14} fill="currentColor" /> Écouter</>}
            </button>
          </div>
        )}
      </article>

      {/* 📝 CORPS DU TEXTE */}
      <div className="prose prose-invert max-w-none space-y-8">
        <div className="text-slate-300 font-sans text-base md:text-lg leading-relaxed whitespace-pre-wrap bg-black/30 border border-white/5 p-8 md:p-12 rounded-3xl shadow-inner">
          {sujet.content}
        </div>

        {/* 🎶 PAROLES (LYRICS) */}
        {sujet.lyrics && (
          <div className="p-8 md:p-10 bg-white/[0.02] border border-[#E5484D]/20 rounded-3xl space-y-4 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-[#E5484D]">
              <Music size={64} />
            </div>
            <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest">
              Paroles / Chant
            </h4>
            <div className="text-slate-200 font-mono text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {sujet.lyrics}
            </div>
          </div>
        )}

        {/* 🛍️ LIEN E-COMMERCE */}
        {sujet.merchLink?.productId && (
          <div className="p-6 bg-gradient-to-r from-white/[0.04] to-[#E5484D]/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E5484D]/20 border border-[#E5484D]/40 flex items-center justify-center text-[#E5484D]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">Œuvre / Produit Associé</p>
                <p className="text-[10px] font-mono text-slate-400">Référence : {sujet.merchLink.productId}</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer">
              Découvrir l'artefact
            </span>
          </div>
        )}

        {/* 🛡️ COPYRIGHT */}
        {sujet.copyright && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-2">
            <ShieldCheck size={14} className="text-slate-400" />
            <span>{sujet.copyright}</span>
          </div>
        )}
      </div>

      {/* 🏷️ TAGS & MAILLAGE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
        {sujet.tags && sujet.tags.length > 0 && (
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Tag size={12} /> Fréquences & Mots-clés
            </h4>
            <div className="flex flex-wrap gap-2">
              {sujet.tags.map((tag: string, idx: number) => (
                <span key={idx} className="text-[11px] font-mono px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {sujet.connections?.relatedProjects && sujet.connections.relatedProjects.length > 0 && (
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-2">
              <Layers size={12} /> Chantiers Illuminés
            </h4>
            <div className="flex flex-wrap gap-2">
              {sujet.connections.relatedProjects.map((pUid: string) => (
                <span key={pUid} className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[#E5484D]/10 border border-[#E5484D]/30 text-slate-200">
                  Nœud : {pUid.substring(0, 8)}...
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 💬 SECTION DES ÉCHOS */}
      <section className="space-y-8 pt-10 border-t border-white/5">
        <div className="flex items-center gap-3">
          <MessageCircle className="text-[#E5484D]" size={20} />
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-100">
            Échos de la Communauté ({echoes.length})
          </h3>
        </div>

        <form onSubmit={handlePostComment} className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Laisser un écho, un murmure ou une résonance..."
            className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-slate-200 outline-none focus:border-[#E5484D] min-h-[100px] resize-y transition-all"
            required
          />
          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={submittingEcho || !newComment.trim()}
              className="px-6 py-3 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-xl shadow-[0_0_20px_rgba(229,72,77,0.2)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submittingEcho ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
              Propager l'Écho
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {echoes.map((echo: any) => (
            <div key={echo.uid || echo._id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                  <User size={12} /> Oiseau [{echo.actorUid ? echo.actorUid.substring(0, 6) : 'Anonyme'}]
                </span>
                <span>{new Date(echo.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              {echo.echoType === 'EMOJI' ? (
                <div className="text-2xl py-1">{echo.content}</div>
              ) : (
                <p className="text-sm text-slate-300 font-sans">{echo.content}</p>
              )}
            </div>
          ))}

          {echoes.length === 0 && (
            <p className="text-center text-xs font-mono uppercase text-slate-600 py-8">
              Aucun écho pour le moment. Soyez le premier à faire vibrer ce texte.
            </p>
          )}
        </div>
      </section>

    </div>
  );
}