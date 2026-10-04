// apps/hub-central/components/poetrik/__tests__/LexicalOracle.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LexicalOracle } from '@/components/poetrik/LexicalOracle';

describe('Composant : LexicalOracle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('🟢 doit afficher le message d\'attente si aucun mot n\'est sélectionné', () => {
    render(<LexicalOracle selectedWord={null} />);
    expect(screen.getByText(/Sélectionne un mot dans ton poème/i)).toBeDefined();
  });

  it('🟢 doit interroger les API et afficher la fiche lexicale et ses rimes', async () => {
    const mockLexiconResponse = {
      success: true,
      data: [
        {
          uid: 'lex_fr_oiseau',
          word: 'oiseau',
          languageCode: 'fr',
          phoneticIpa: '/wa.zo/',
          syllableCount: 2,
          definitions: { fr: 'Animal à plumes.' },
          partOfSpeech: 'noun'
        }
      ]
    };

    const mockRhymesResponse = {
      success: true,
      data: [
        {
          uid: 'lex_fr_roseau',
          word: 'roseau',
          languageCode: 'fr',
          phoneticIpa: '/ʁo.zo/',
          syllableCount: 2,
          rhymeType: 'rich'
        }
      ]
    };

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      if (url.includes('/api/poetrik/lexicon')) {
        return new Response(JSON.stringify(mockLexiconResponse), { status: 200 });
      }
      if (url.includes('/api/poetrik/rhymes')) {
        return new Response(JSON.stringify(mockRhymesResponse), { status: 200 });
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    const mockSelectRhyme = vi.fn();
    render(<LexicalOracle selectedWord="oiseau" onSelectRhyme={mockSelectRhyme} />);

    // Vérifie l'état de chargement initial
    expect(screen.getByTestId('oracle-loading')).toBeDefined();

    // Attend que les données soient affichées
    await waitFor(() => {
      expect(screen.getByTestId('oracle-content')).toBeDefined();
    });

    // Utilisation de getAllByText car "oiseau" est présent dans le badge et dans la fiche
    const oiseauElements = screen.getAllByText('oiseau');
    expect(oiseauElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('/wa.zo/')).toBeDefined();
    expect(screen.getByText('Animal à plumes.')).toBeDefined();
    expect(screen.getByText('roseau')).toBeDefined();

    // Test du clic sur une rime
    const rhymeBtn = screen.getByTestId('rhyme-button');
    fireEvent.click(rhymeBtn);
    expect(mockSelectRhyme).toHaveBeenCalledWith('roseau');
  });

  it('🔴 doit afficher une erreur si le mot est introuvable dans l\'Oracle', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })
    );

    render(<LexicalOracle selectedWord="inconnu" />);

    await waitFor(() => {
      expect(screen.getByTestId('oracle-error')).toBeDefined();
    });

    expect(screen.getByText("Ce mot sommeille encore hors de l'Oracle.")).toBeDefined();
  });
});