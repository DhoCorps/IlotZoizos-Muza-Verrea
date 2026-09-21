'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, ArrowLeft, Play, Pause, Music, 
  MessageCircle, Send, Calendar, User, Sparkles, Share2, MessageSquarePlus, Hash
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { OmniActionWidget } from '../../../../../components/widget/OmniActionWidget';
import { IUniversalMediaItem } from '@ilot/types';
import { useCommentDrawer } from '@/components/global/UniversalCommentDrawer';

interface AbyssBlogClientViewProps {
  sujet: any;
  initialComments: any[];
}

export default function AbyssBlogClientView({ sujet, initialComments }: AbyssBlogClientViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer } = useCommentDrawer();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isWidgetOpen, setWidgetOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  usePageChapeauContext({
    recipientUid: sujet?.authorUid || sujet?.ownerUid || 'canopy_abyss_treasury',
    recipientPseudo: sujet?.authorName || sujet?.author || 'un Oiseau de l\'Abysse',
    targetTitle: sujet?.title || 'Monologue AbyssBlog',
  });

  const { data: echoes = initialComments } = useQuery({
    queryKey: ['echoes', sujet?.uid],
    queryFn: async () => {
      const res = await fetch(`/api/resonance/echoes?targetUid=${sujet.uid}`);
      if (!res.ok) throw new Error("Échec du chargement des échos");
      return res.json();
    },
    initialData: initialComments,
    enabled: !!sujet?.uid
  });

  const echoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/resonance/echoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Impossible de sceller l'écho");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['echoes', sujet?.uid] });
      setNewComment('');
      toast.success("Écho propagé.");
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    }
  });

  useEffect(() => {
    if (sujet?.media?.audioTrackUrl) {
      audioRef.current = new Audio(sujet.media.audioTrackUrl);
      if (audioRef.current) {
        audioRef.current.onended = () => setIsPlayingAudio(false);
      }
      
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = ""; 
          audioRef.current = null;
        }
      };
    }
  }, [sujet?.media?.audioTrackUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) { 
      audioRef.current.pause(); 
      setIsPlayingAudio(false); 
    } else { 
      audioRef.current.play(); 
      setIsPlayingAudio(true); 
    }
  };

  const universalMediaItem: IUniversalMediaItem | null = useMemo(() => {
    if (!sujet) return null;
    return {
      mediaId: sujet.uid,
      sourceApp: 'ABYSS',
      ownerUid: sujet.authorUid || '',
      ownerSlug: sujet.authorName || 'anonyme',
      title: sujet.title,
      mediaUrl: sujet.media?.coverImageUrl || sujet.media?.audioTrackUrl || '',
      thumbnailUrl: sujet.media?.coverImageUrl,
      priceCents: sujet.merchLink?.priceCents || undefined,
      consentForShowcase: !!sujet.settings?.consentForShowcase,
      consentForMusicSync: !!sujet.settings?.consentForMusicSync,
      createdAt: new Date(sujet.createdAt),
    };
  }, [sujet]);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <button onClick={() => router.push('/abyss-blog')} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-all flex items-center gap-2">
          <ArrowLeft size={14} /> Revenir au Flux
        </button>

        <div className="flex items-center gap-2">
          <button 
            data-testid="open-resonance-drawer-btn"
            onClick={() => openDrawer(sujet.uid, 'BLOG')} 
            className="px-4 py-2 bg-[#E5484D]/20 hover:bg-[#E5484D]/30 border border-[#E5484D]/40 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg"
          >
            <MessageSquarePlus size={14} /> Ouvrir les Résonances
          </button>

          <button 
            onClick={() => setWidgetOpen(true)} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-2 shadow-lg"
          >
            <Share2 size={14} /> Interagir & Partager
          </button>
        </div>
      </div>

      <article className="space-y-6 border-b border-white/5 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#E5484D]/10 text-[#E5484D] border border-[#E5484D]/20 uppercase tracking-widest">{sujet.category}</span>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5"><Calendar size={12} /> {new Date(sujet.createdAt).toLocaleDateString()}</span>
            </div>
            
            {sujet.tags && sujet.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sujet.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-[10px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-widest flex items-center gap-1">
                    <Hash size={10} className="text-slate-500" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 flex items-center gap-1"><Sparkles size={10} className="text-[#E5484D]" /> Vibre :</span>
            {['<(:<', '🔥', '❤️', '🧠', '✨', '☕'].map((emoji) => (
              <button key={emoji} onClick={() => echoMutation.mutate({ targetUid: sujet.uid, targetLabel: 'Sujet', echoType: 'EMOJI', content: emoji })} className="px-2 py-1 hover:bg-[#E5484D]/20 rounded-xl text-xs transition-all hover:scale-110">{emoji}</button>
            ))}
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-100">{sujet.title}</h1>

        {sujet.media?.audioTrackUrl && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Music size={20} /></div>
              <div>
                <p className="text-xs font-black uppercase text-emerald-300">Audio Attaché</p>
                <p className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">{sujet.media.audioTrackUrl}</p>
              </div>
            </div>
            <button onClick={toggleAudio} data-testid="audio-toggle-btn" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs rounded-xl transition-all flex items-center gap-2">
              {isPlayingAudio ? <><Pause size={14} /> Silence</> : <><Play size={14} /> Écouter</>}
            </button>
          </div>
        )}
      </article>

      <div className="prose prose-invert max-w-none">
        <div className="text-slate-300 bg-black/30 border border-white/5 p-8 md:p-12 rounded-3xl whitespace-pre-wrap">{sujet.content}</div>
      </div>

      <section className="space-y-8 pt-10 border-t border-white/5">
        <div className="flex items-center gap-3">
          <MessageCircle className="text-[#E5484D]" size={20} />
          <h3 className="text-xl font-black uppercase text-slate-100">Échos ({echoes.length})</h3>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); echoMutation.mutate({ targetUid: sujet.uid, targetLabel: 'Sujet', echoType: 'TEXT', content: newComment }); }} className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un écho..." className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm text-slate-200 outline-none focus:border-[#E5484D] min-h-[100px]" required />
          <div className="flex justify-end">
            <button type="submit" disabled={echoMutation.isPending} className="px-6 py-3 bg-[#E5484D] text-white font-black uppercase text-xs rounded-xl flex items-center gap-2">
              {echoMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Propager
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {echoes.map((echo: any) => (
            <div key={echo.uid || echo._id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span><User size={10} className="inline"/> {echo.actorUid?.substring(0, 6) || 'Anonyme'}</span>
                <span>{new Date(echo.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-300 mt-2">{echo.content}</p>
            </div>
          ))}
        </div>
      </section>

      {universalMediaItem && (
        <OmniActionWidget 
          media={universalMediaItem}
          isOpen={isWidgetOpen}
          onClose={() => setWidgetOpen(false)}
        />
      )}
    </div>
  );
}