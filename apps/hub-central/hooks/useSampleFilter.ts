import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';

export function useSampleFilter(samples: any[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState('ALL');

  // Configuration de Fuse.js pour une recherche ultra-tolérante sur le titre et le style
  const fuse = useMemo(() => {
    return new Fuse(samples, {
      keys: ['title', 'style', 'musicalKey'],
      threshold: 0.4, // Tolérance aux fautes de frappe
    });
  }, [samples]);

  const filteredSamples = useMemo(() => {
    let result = samples;

    // 1. Recherche textuelle via Fuse.js si une requête est saisie
    if (searchQuery.trim() !== '') {
      result = fuse.search(searchQuery).map(res => res.item);
    }

    // 2. Filtre par Style
    if (selectedStyle !== 'ALL') {
      result = result.filter((s: any) => s.style.toLowerCase() === selectedStyle.toLowerCase());
    }

    // 3. Filtre par Tonalité (Key)
    if (selectedKey !== 'ALL') {
      result = result.filter((s: any) => s.musicalKey.toLowerCase() === selectedKey.toLowerCase());
    }

    return result;
  }, [samples, searchQuery, selectedStyle, selectedKey, fuse]);

  return {
    searchQuery,
    setSearchQuery,
    selectedStyle,
    setSelectedStyle,
    selectedKey,
    setSelectedKey,
    filteredSamples,
  };
}