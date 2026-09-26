'use client';

import { useState } from 'react';
import { 
  Type, Plus, Trash2, Edit3, Loader2, Sparkles, Compass, ArrowLeft, 
  Filter, Search, Repeat2
} from 'lucide-react';
import { LetrinEditor, PixelData, LetrinSavePayload } from '@/components/letrin/LetrinEditor';
import ResonanceButton from '@/components/resonance/ResonanceButton';
import { usePageChapeauContext } from '@/hooks/usePageChapeauContext';
import { useLetrin } from './useLetrin';

type GlyphMatrix = (PixelData | null)[][];
type MatricesRecord = Record<string, GlyphMatrix>;

const CATEGORY_OPTIONS = ['ALL', 'HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'];

export default function LetrInSpritePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentFont, setCurrentFont] = useState<any>(null);
  const [fontName, setFontName] = useState('Nouvelle Police Sprite');

  // 🔍 Filtres locaux
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTag, setSearchTag] = useState<string>('');

  // 🦅 Synchronisation avec le Chapeau Flottant
  usePageChapeauContext({
    recipientUid: 'canopy_letrin_treasury',
    recipientPseudo: 'La Forge Typographique',
    targetTitle: isEditing ? `Édition : ${fontName}` : 'Letr\'In Sprites',
  });

  // 🌀 Connexion à la logique Client-Serveur unifiée
  const { fonts, loading, saveMutation, handleDelete, deleteMutation } = useLetrin({
    category: filterCategory,
    tag: searchTag.trim().toLowerCase()
  });

  const handleOpenCreate = () => {
    setCurrentFont(null);
    setFontName('Police Sans Nom');
    setIsEditing(true);
  };

  const handleOpenEdit = (font: any) => {
    setCurrentFont(font);
    setFontName(font.name);
    setIsEditing(true);
  };

  // 🔠 Conversion du Payload Zod de l'éditeur vers l'API
  const handleSaveFont = (editorPayload: LetrinSavePayload) => {
    const formattedGlyphs = Object.entries(editorPayload.matrices).map(([char, matrix]) => ({
      character: char,
      frames: [
        {
          frameIndex: 0,
          width: matrix[0]?.length || 16,
          height: matrix.length || 16,
          pixels: matrix.flat().map(cell => cell ? (cell.c !== 'transparent' ? cell.c : 'filled') : '0')
        }
      ],
      advanceWidth: matrix[0]?.length || 16,
      barter: { isBarterable: editorPayload.visibility === 'EXCHANGEABLE', barterValueKarma: 10 }
    }));

    const payload = {
      name: fontName,
      category: editorPayload.category,
      tags: editorPayload.tags,
      frequencyHz: editorPayload.frequencyHz,
      isFrequencyMuted: editorPayload.isFrequencyMuted,
      seo: editorPayload.seo,
      copyrightMetadata: editorPayload.copyrightMetadata,
      gridSize: { width: 16, height: 16 },
      glyphs: formattedGlyphs,
      status: editorPayload.visibility === 'PRIVATE' ? 'DRAFT' : 'RELEASED'
    };

    saveMutation.mutate({ payload, fontUid: currentFont?.uid }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  let initialGlyphs: MatricesRecord = {};
  if (isEditing && currentFont && currentFont.glyphs) {
    currentFont.glyphs.forEach((g: any) => {
      if (g.frames && g.frames[0]) {
        const frame = g.frames[0];
        const width = frame.width || 16;
        const height = frame.height || 16;
        
        const matrix: GlyphMatrix = [];
        for (let i = 0; i < height; i++) {
          const rowSlice = frame.pixels.slice(i * width, (i + 1) * width);
          const rowCells: (PixelData | null)[] = rowSlice.map((p: string) => {
            if (p === '0' || !p) return null;
            return { c: p === 'filled' ? '#708090' : p, s: 'full', r: 0, bt: false, bb: false, bl: false, br: false, bc: 'transparent', bw: 1 };
          });
          matrix.push(rowCells);
        }
        initialGlyphs[g.character] = matrix;
      }
    });
  }

  if (isEditing) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-500">
        <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={14} /> Retour au Catalogue
          </button>
          <input 
            type="text"
            value={fontName}
            onChange={(e) => setFontName(e.target.value)}
            className="bg-black/60 border border-white/10 px-4 py-2 rounded-xl text-sm font-black text-white uppercase outline-none focus:border-[#E5484D]"
            placeholder="Nom de la police..."
          />
        </div>
        <LetrinEditor 
          fontTitle={fontName}
          initialGridSize={16}
          initialGlyphs={initialGlyphs}
          initialVisibility={currentFont?.status === 'DRAFT' ? 'PRIVATE' : 'PUBLIC'}
          onSave={handleSaveFont}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#E5484D]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-full text-[10px] font-black text-[#E5484D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> Letr'In & Sprites
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            La Forge Typographique
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            Dessine tes glyphes pixel par pixel, fusionne la typographie et le pixel art, et sédimente tes polices au cœur de la matrice.
          </p>
        </div>

        <div className="flex flex-col gap-4 z-10 w-full md:w-auto">
          <button 
            onClick={handleOpenCreate}
            className="px-6 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Nouvelle Police
          </button>
        </div>
      </div>

      {/* 🔍 BARRE DE FILTRAGE & RECHERCHE */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10 flex-1 min-w-[200px]">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent text-xs text-white font-mono uppercase tracking-wider outline-none w-full"
          >
            {CATEGORY_OPTIONS.map(cat => (
              <option key={cat} value={cat} className="bg-black">{cat === 'ALL' ? 'Toutes les catégories' : cat}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher par tag (ex: magie, cyberpunk)..." 
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            className="bg-transparent text-xs text-white font-mono placeholder:text-slate-600 outline-none w-full"
          />
        </div>
      </div>

      {/* 📜 LISTE DES POLICES SPRITES */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5484D]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fonts.map((font: any) => {
            const fontId = font.uid || font._id;
            const authorSlug = font.authorSlug || font.ownerUid || 'createur-inconnu';
            const barterCount = font.glyphs?.filter((g: any) => g.barter?.isBarterable).length || 0;

            return (
              <div 
                key={fontId} 
                className="p-6 bg-slate-900/30 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6 hover:border-slate-700/50 transition-all group relative"
              >
                <div className="absolute top-6 right-6 z-10">
                  <ResonanceButton 
                    targetSlug={authorSlug}
                    type="FOLLOWS_SPECIFIC"
                    entityId={fontId}
                    variant="icon"
                    initialIsFollowing={font.isFollowedByMe}
                  />
                </div>

                <div className="space-y-4 pr-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {font.status || 'RELEASED'}
                    </span>
                    <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-500/20 text-slate-300 border border-slate-500/30">
                      {font.category || 'LINEALE'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
                    {font.name}
                  </h3>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-400 font-mono">
                      Glyphes sédimentés : <span className="text-white font-bold">{font.glyphs?.length || 0}</span>
                    </p>
                    {/* 🔄 Vitrine du Barter */}
                    {barterCount > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 w-fit px-2 py-1 rounded-lg border border-amber-500/20">
                        <Repeat2 size={12} /> {barterCount} Glyphe{barterCount > 1 ? 's' : ''} en Troc (Échange d'énergies)
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => handleOpenEdit(font)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold rounded-xl border border-white/10 text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={12} /> Éditer la Matrice
                  </button>

                  <button 
                    onClick={() => handleDelete(fontId)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === fontId}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all disabled:opacity-50"
                    title="Dissoudre"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === fontId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {fonts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucune anomalie typographique détectée pour ces filtres.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}