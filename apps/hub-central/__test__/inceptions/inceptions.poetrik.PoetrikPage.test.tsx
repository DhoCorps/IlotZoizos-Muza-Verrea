// apps/hub-central/app/[locale]/(inceptions)/poetrik/__tests__/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PoetrikPage from '@/app/[locale]/(inceptions)/poetrik/page';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock des composants enfants pour isoler le test de la page
vi.mock('@/components/poetrik/PoetrikCanvas', () => ({
  PoetrikCanvas: ({ onContentChange, onWordSelect }: any) => (
    <div data-testid="poetrik-canvas">
      <textarea 
        data-testid="canvas-textarea"
        onChange={(e) => onContentChange && onContentChange(e.target.value)}
      />
      <button onClick={() => onWordSelect && onWordSelect('oiseau')} data-testid="select-word-btn">
        Sélectionner oiseau
      </button>
    </div>
  ),
}));

vi.mock('@/components/poetrik/LexicalOracle', () => ({
  LexicalOracle: ({ selectedWord }: any) => (
    <div data-testid="lexical-oracle">Mot actif : {selectedWord || 'aucun'}</div>
  ),
}));

vi.mock('@/components/poetrik/PoetrikToolbar', () => ({
  PoetrikToolbar: ({ onSave, isSaving }: any) => (
    <div data-testid="poetrik-toolbar">
      <button onClick={onSave} disabled={isSaving} data-testid="toolbar-save-btn">
        {isSaving ? 'En cours...' : 'Sceller'}
      </button>
    </div>
  ),
}));

vi.mock('@/components/poetrik/RhymeGraphView', () => ({
  RhymeGraphView: () => <div data-testid="rhyme-graph">Graphe Neo4j</div>,
}));

vi.mock('@/components/poetrik/PoetrikAudioAmbiance', () => ({
  PoetrikAudioAmbiance: () => <div data-testid="audio-ambiance">Lecteur Audio</div>,
}));

describe('Page d\'Inception : PoetrikPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('🟢 doit rendre la structure complète de l\'atelier Poetrik', () => {
    render(<PoetrikPage />);

    expect(screen.getByTestId('poetrik-toolbar')).toBeDefined();
    expect(screen.getByTestId('poetrik-canvas')).toBeDefined();
    expect(screen.getByTestId('lexical-oracle')).toBeDefined();
    expect(screen.getByTestId('audio-ambiance')).toBeDefined();
    expect(screen.getByPlaceholderText(/Titre de votre chant poétique/i)).toBeDefined();
  });

  it('🔴 doit refuser de sceller si le titre ou le contenu est vide', async () => {
    render(<PoetrikPage />);

    const saveBtn = screen.getByTestId('toolbar-save-btn');
    fireEvent.click(saveBtn);

    // Fetch ne doit pas être appelé car la validation bloque l'action
    expect(fetch).not.toHaveBeenCalled();
  });

  it('🟢 doit sédimenter le poème et planter la balise sur l\'Agora en cas de succès', async () => {
    // Mock des réponses API (Poème + Balise)
    vi.mocked(fetch).mockImplementation(async (url: any) => {
      if (url.includes('/api/poetrik/poems')) {
        return new Response(JSON.stringify({ success: true, data: { mongo: { uid: 'poem_123' } } }), { status: 201 });
      }
      if (url.includes('/api/univershall/beacons')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    });

    render(<PoetrikPage />);

    // Renseigne le titre
    const titleInput = screen.getByPlaceholderText(/Titre de votre chant poétique/i);
    fireEvent.change(titleInput, { target: { value: 'Chant d\'Automne' } });

    // Renseigne le contenu dans le canevas simulé
    const textarea = screen.getByTestId('canvas-textarea');
    fireEvent.change(textarea, { target: { value: 'Les feuilles tombent doucement...' } });

    // Clique sur le bouton de sauvegarde de la toolbar
    const saveBtn = screen.getByTestId('toolbar-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Vérifie l'appel au endpoint Poetrik
    expect(fetch).toHaveBeenCalledWith(
      '/api/poetrik/poems',
      expect.objectContaining({ method: 'POST' })
    );

    // Vérifie l'appel au endpoint Univers'Hall (Balise)
    expect(fetch).toHaveBeenCalledWith(
      '/api/univershall/beacons',
      expect.objectContaining({ method: 'POST' })
    );
  });
});