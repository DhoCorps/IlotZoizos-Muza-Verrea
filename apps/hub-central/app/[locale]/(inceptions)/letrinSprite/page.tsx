// apps/hub-central/app/[locale]/(inceptions)/letrinSprite/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Type, Plus, Trash2, Edit3, Loader2, Sparkles, Compass, Save, ArrowLeft 
} from 'lucide-react';
import { lettrinSprites } from '@/lib/apiClient';
import { LetrinEditor, PixelData } from '@/components/letrin/LetrinEditor';
import ResonanceButton from '@/components/resonance/ResonanceButton'; // 🕸️ NOUVEAU : Import du tisseur

type GlyphMatrix = (PixelData | null)[][];
type MatricesRecord = Record<string, GlyphMatrix>;

export default function LetrInSpritePage() {
  const [fonts, setFonts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFont, setCurrentFont] = useState<any>(null);
  const [fontName, setFontName] = useState('Nouvelle Police Sprite');

  const fetchFonts = async () => {
    try {
      setLoading(true);
      const data = await lettrinSprites.getAll();
      if (Array.isArray(data)) setFonts(data);
    } catch (err) {
      console.error("🌊 Fracture lors du recensement des polices Letr'In :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFonts();
  }, []);

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

  const handleDelete = async (fontId: string) => {
    if (!confirm("Es-tu sûr de vouloir dissoudre cette police dans le néant ?")) return;
    try {
      await lettrinSprites.delete(fontId);
      setFonts(prev => prev.filter(f => f.uid !== fontId));
    } catch (err) {
      console.error("🔥 Erreur lors de la désintégration de la police :", err);
    }
  };

  // Sauvegarde des glyphes de l'éditeur vers la Silice & le Graphe avec gestion PixelData
  const handleSaveFont = async (matrices: MatricesRecord) => {
    try {
      const formattedGlyphs = Object.entries(matrices).map(([char, matrix]) => ({
        character: char,
        frames: [
          {
            frameIndex: 0,
            width: matrix[0]?.length || 16,
            height: matrix.length || 16,
            pixels: matrix.flat().map(cell => cell ? (cell.c !== 'transparent' ? cell.c : 'filled') : '0')
          }
        ],
        advanceWidth: matrix[0]?.length || 16
      }));

      const payload = {
        name: fontName,
        gridSize: { width: 16, height: 16 },
        glyphs: formattedGlyphs,
        status: 'RELEASED'
      };

      if (currentFont) {
        await lettrinSprites.update(currentFont.uid, payload);
      } else {
        await lettrinSprites.create(payload);
      }

      setIsEditing(false);
      fetchFonts();
    } catch (err) {
      console.error("🔥 Erreur lors de la sédimentation de la police :", err);
    }
  };

  // Préparation des glyphes initiaux si on édite une police existante
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
            return {
              c: p === 'filled' ? '#708090' : p,
              s: 'full',
              r: 0,
              bt: false,
              bb: false,
              bl: false,
              br: false,
              bc: 'transparent',
              bw: 1
            };
          });
          matrix.push(rowCells);
        }
        initialGlyphs[g.character] = matrix;
      }
    });
  }

  // Si on est en mode édition, on affiche l'éditeur Letr'In
  if (isEditing) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
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

        {/* L'Éditeur de Sprite Letr'In */}
        <LetrinEditor 
          fontTitle={fontName}
          initialGridSize={16}
          initialGlyphs={initialGlyphs}
          onSave={handleSaveFont}
        />
      </div>
    );
  }

  // Sinon, on affiche le Dashboard / Catalogue des polices
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* 🌌 EN-TÊTE LETR'IN */}
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

        <div className="flex items-center gap-4 z-10">
          <button 
            onClick={handleOpenCreate}
            className="px-6 py-4 bg-[#E5484D] hover:bg-[#c43d41] text-white font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Nouvelle Police Sprite
          </button>
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

            return (
              <div 
                key={fontId} 
                className="p-6 bg-black/30 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6 hover:border-white/20 transition-all group relative"
              >
                {/* 🕸️ Bouton de Résonance granulaire sur la police */}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {font.status || 'RELEASED'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Grille {font.gridSize?.width || 16}x{font.gridSize?.height || 16}
                    </span>
                  </div>

                  <h3 className="text-lg font-black uppercase text-white group-hover:text-[#E5484D] transition-colors line-clamp-1">
                    {font.name}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono">
                    Glyphes sédimentés : <span className="text-white font-bold">{font.glyphs?.length || 0}</span>
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => handleOpenEdit(font)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold rounded-xl border border-white/10 text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={12} /> Éditer les Sprites
                  </button>

                  <button 
                    onClick={() => handleDelete(fontId)}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                    title="Dissoudre"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {fonts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 bg-black/20 border border-white/5 rounded-3xl">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Aucune police de sprites n'a encore été forgée dans la matrice.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}