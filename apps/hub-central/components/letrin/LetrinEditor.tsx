'use client';

import { useState, useRef } from 'react';
import { Pencil, Square, Eraser, Download, Save, RefreshCw, Layers } from 'lucide-react';

interface LetrinEditorProps {
  fontTitle?: string;
  gridSize?: number;
  initialGlyphs?: Record<string, number[][]>;
  onSave: (glyphs: Record<string, number[][]>) => void;
}

export function LetrinEditor({ 
  fontTitle = "Ma Nouvelle Police", 
  gridSize = 16, 
  initialGlyphs = {}, 
  onSave 
}: LetrinEditorProps) {
  
  const [selectedChar, setSelectedChar] = useState<string>('A');
  const [tool, setTool] = useState<'pencil' | 'rect' | 'eraser'>('pencil');
  const [fillMode, setFillMode] = useState<'solid' | 'border' | 'both'>('both');
  
  // Initialisation de la matrice des glyphes (0 = vide, 1 = intérieur/remplissage, 2 = bordure)
  const [glyphs, setGlyphs] = useState<Record<string, number[][]>>(() => {
    if (Object.keys(initialGlyphs).length > 0) return initialGlyphs;
    
    // Grille par défaut vide pour l'alphabet de A à Z et 0 à 9
    const defaultGlyphs: Record<string, number[][]> = {};
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ".split('');
    chars.forEach(char => {
      defaultGlyphs[char] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    });
    return defaultGlyphs;
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number, y: number } | null>(null);

  const currentMatrix = glyphs[selectedChar] || Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

  // Gestion du dessin à la souris sur la grille
  const handleMouseDown = (x: number, y: number) => {
    setIsDrawing(true);
    if (tool === 'rect') {
      setRectStart({ x, y });
    } else {
      applyTool(x, y);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!isDrawing) return;
    if (tool !== 'rect') {
      applyTool(x, y);
    }
  };

  const handleMouseUp = (x: number, y: number) => {
    if (isDrawing && tool === 'rect' && rectStart) {
      applyRectangle(rectStart.x, rectStart.y, x, y);
    }
    setIsDrawing(false);
    setRectStart(null);
  };

  const applyTool = (x: number, y: number) => {
    const newMatrix = currentMatrix.map(row => [...row]);
    
    if (tool === 'pencil') {
      newMatrix[y][x] = fillMode === 'border' ? 2 : 1;
    } else if (tool === 'eraser') {
      newMatrix[y][x] = 0;
    }

    setGlyphs({ ...glyphs, [selectedChar]: newMatrix });
  };

  const applyRectangle = (x1: number, y1: number, x2: number, y2: number) => {
    const newMatrix = currentMatrix.map(row => [...row]);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const isBorder = x === minX || x === maxX || y === minY || y === maxY;
        
        if (fillMode === 'both') {
          newMatrix[y][x] = isBorder ? 2 : 1;
        } else if (fillMode === 'border' && isBorder) {
          newMatrix[y][x] = 2;
        } else if (fillMode === 'solid' && !isBorder) {
          newMatrix[y][x] = 1;
        }
      }
    }

    setGlyphs({ ...glyphs, [selectedChar]: newMatrix });
  };

  const clearGrid = () => {
    const emptyMatrix = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    setGlyphs({ ...glyphs, [selectedChar]: emptyMatrix });
  };

  // Génération d'un aperçu SVG dynamique du glyphe actuel
  const renderGlyphSvg = () => {
    let paths = '';
    currentMatrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell > 0) {
          paths += `<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="${cell === 2 ? '#E5484D' : '#ffffff'}" stroke="${cell === 2 ? '#ff7b7f' : 'none'}" stroke-width="1" />`;
        }
      });
    });
    return `<svg viewBox="0 0 ${gridSize * 10} ${gridSize * 10}" width="120" height="120">${paths}</svg>`;
  };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl text-white">
      
      {/* 🔠 COLONNE GAUCHE : Sélecteur de Caractères & Aperçu */}
      <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#E5484D]">Glyphes</h3>
            <span className="text-[10px] font-mono text-slate-400">Grille : {gridSize}x{gridSize}</span>
          </div>

          {/* Grille de sélection des lettres */}
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto custom-scrollbar p-1 bg-black/20 rounded-2xl border border-white/5">
            {alphabet.map(char => {
              const hasContent = glyphs[char]?.some(row => row.some(cell => cell > 0));
              return (
                <button
                  key={char}
                  onClick={() => setSelectedChar(char)}
                  className={`aspect-square rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center relative ${
                    selectedChar === char 
                      ? 'bg-[#E5484D] text-white shadow-[0_0_15px_rgba(229,72,77,0.4)]' 
                      : hasContent
                      ? 'bg-white/10 text-slate-200 border border-white/10'
                      : 'bg-white/5 text-slate-500 hover:bg-white/10'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aperçu Live du Glyphe */}
        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl flex flex-col items-center space-y-3">
          <span className="text-[10px] font-mono uppercase text-slate-400">Aperçu Vectoriel ({selectedChar})</span>
          <div 
            className="p-2 bg-white/5 rounded-xl border border-white/5"
            dangerouslySetInnerHTML={{ __html: renderGlyphSvg() }}
          />
        </div>

        <button 
          onClick={() => onSave(glyphs)}
          className="w-full py-4 bg-[#E5484D] hover:bg-[#c43d41] font-black uppercase text-xs rounded-2xl shadow-[0_0_20px_rgba(229,72,77,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} /> Enregistrer la Police (JSON / SVG)
        </button>
      </div>

      {/* 🎨 COLONNE CENTRALE & DROITE : Éditeur de Matrice & Outils */}
      <div className="lg:col-span-8 space-y-6 flex flex-col">
        
        {/* Barre d'outils (Crayon, Rectangle, Gomme, Remplissage / Bordure) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pencil')}
              className={`p-2.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${tool === 'pencil' ? 'bg-white text-black font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              title="Crayon Pixel"
            >
              <Pencil size={14} /> Crayon
            </button>
            <button
              onClick={() => setTool('rect')}
              className={`p-2.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${tool === 'rect' ? 'bg-white text-black font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              title="Forme Rectangle"
            >
              <Square size={14} /> Rectangle
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${tool === 'eraser' ? 'bg-white text-black font-bold' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              title="Gomme"
            >
              <Eraser size={14} /> Gomme
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Style :</span>
            <select 
              value={fillMode} 
              onChange={(e: any) => setFillMode(e.target.value)}
              className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none font-mono focus:border-[#E5484D]"
            >
              <option value="both">Plein & Bordure</option>
              <option value="border">Bordure Seule (Contour)</option>
              <option value="solid">Intérieur Plein (Remplissage)</option>
            </select>

            <button 
              onClick={clearGrid}
              className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-xs transition-all"
              title="Vider la grille"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Grille Interactive de Dessin */}
        <div className="flex-1 flex items-center justify-center p-6 bg-black/60 border border-white/10 rounded-3xl overflow-auto">
          <div 
            className="grid gap-[1px] bg-white/10 p-2 rounded-2xl select-none"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              width: `${gridSize * 24}px`,
              height: `${gridSize * 24}px`
            }}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {currentMatrix.map((row, y) => 
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  onMouseDown={() => handleMouseDown(x, y)}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onMouseUp={() => handleMouseUp(x, y)}
                  className={`aspect-square rounded-[2px] cursor-pointer transition-colors ${
                    cell === 2 
                      ? 'bg-[#E5484D] shadow-[0_0_8px_rgba(229,72,77,0.6)]' // Bordure
                      : cell === 1 
                      ? 'bg-white' // Intérieur plein
                      : 'bg-black/80 hover:bg-white/20' // Vide
                  }`}
                />
              ))
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Édition du caractère : <span className="text-white font-bold text-sm">[{selectedChar}]</span> — Glissez la souris pour peindre ou tracer des formes.
          </p>
        </div>

      </div>

    </div>
  );
}