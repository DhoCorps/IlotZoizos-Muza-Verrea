'use client';

import { useState, useEffect, useRef } from 'react';
import { compileAndInjectFont } from '../../app/api/letrin/fonts/injector/fontInjector';
import { useLetrinFont } from './LetrinFontContext'; // Optionnel : utilise le Context s'il est présent
import { Type, Upload } from 'lucide-react';

interface FontItem {
  _id: string;
  title: string;
  resolution: number;
  license: string;
  matrices: Record<string, any[][]>;
}

interface LetrinFontSelectorProps {
  onFontSelect?: (fontName: string) => void;
}

export function LetrinFontSelector({ onFontSelect }: LetrinFontSelectorProps) {
  // Tentative d'utilisation du Context global (permet de propager la police partout)
  let globalContext: ReturnType<typeof useLetrinFont> | null = null;
  try {
    globalContext = useLetrinFont();
  } catch {
    globalContext = null;
  }

  const [localFonts, setLocalFonts] = useState<FontItem[]>([]);
  const [localSelectedFont, setLocalSelectedFont] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utilisation des sources globales ou locales selon le contexte
  const fonts = globalContext ? globalContext.fonts : localFonts;
  const selectedFont = globalContext ? globalContext.activeFont : localSelectedFont;

  useEffect(() => {
    // Si le Context global ne gère pas déjà le fetch, on le fait localement
    if (!globalContext) {
      fetch('/api/letrin/fonts')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLocalFonts(data.data);
            data.data.forEach((font: FontItem) => {
              compileAndInjectFont(font.title, font.matrices, font.resolution);
            });
          }
        })
        .catch(err => console.error("Erreur de chargement des polices Letr'In", err));
    }
  }, [globalContext]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontName = e.target.value;
    
    if (globalContext) {
      globalContext.setActiveFont(fontName);
    } else {
      setLocalSelectedFont(fontName);
    }

    if (onFontSelect) {
      onFontSelect(fontName);
    }
  };

  // --- NOUVEAU : Gestion de l'importation de polices tierces ---
  const handleExternalFontImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Nom de la police basé sur le nom du fichier sans l'extension
    const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const reader = new FileReader();

    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const blob = new Blob([buffer], { type: file.type || 'font/ttf' });
      const url = URL.createObjectURL(blob);

      // Injection dynamique dans le <head> du document
      const styleId = `external-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
      let styleTag = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }

      styleTag.innerHTML = `
        @font-face {
          font-family: '${fontName}';
          src: url('${url}') format('truetype');
        }
      `;

      // Création d'un objet "fictif" pour l'ajouter instantanément à la liste déroulante
      const externalFontItem: FontItem = {
        _id: `ext-${Date.now()}`,
        title: fontName,
        resolution: 16,
        license: 'external',
        matrices: {}
      };

      if (globalContext) {
        // Si tu souhaites enrichir le context global, tu peux adapter selon ton architecture, 
        // ou simplement injecter localement dans la liste affichée :
        setLocalFonts(prev => [...prev, externalFontItem]);
      } else {
        setLocalFonts(prev => [...prev, externalFontItem]);
      }

      // Sélection automatique de la police importée
      if (globalContext) {
        globalContext.setActiveFont(fontName);
      } else {
        setLocalSelectedFont(fontName);
      }

      if (onFontSelect) {
        onFontSelect(fontName);
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset de l'input file pour permettre de réimporter le même fichier si besoin
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-2xl backdrop-blur-md">
      <Type size={14} className="text-[#E5484D]" />
      <select 
        value={selectedFont} 
        onChange={handleChange}
        className="bg-transparent text-xs text-white font-mono uppercase tracking-wider outline-none cursor-pointer"
        style={{ fontFamily: selectedFont ? `'${selectedFont}', sans-serif` : 'inherit' }}
      >
        <option value="" className="bg-black text-slate-400">-- Police Standard --</option>
        {fonts.map(font => (
          <option key={font._id} value={font.title} className="bg-black text-white" style={{ fontFamily: `'${font.title}', sans-serif` }}>
            {font.title} [{font.license.toUpperCase()}]
          </option>
        ))}
      </select>

      {/* Bouton d'importation de police tierce */}
      <button 
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        title="Importer une police tierce (.ttf, .otf, .woff)"
      >
        <Upload size={14} />
      </button>

      <input 
        type="file" 
        accept=".ttf,.otf,.woff,.woff2" 
        ref={fileInputRef} 
        onChange={handleExternalFontImport} 
        className="hidden" 
      />
    </div>
  );
}