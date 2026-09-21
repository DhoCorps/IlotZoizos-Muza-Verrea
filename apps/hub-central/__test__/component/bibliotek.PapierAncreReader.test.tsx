import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PapierAncreReader } from '@/components/bibliotek/PapierAncreReader';
import { toast } from 'sonner';
import React from 'react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

const mockGetSelection = vi.fn();
window.getSelection = mockGetSelection as any;

const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: mockPause,
    resume: mockResume,
  },
  writable: true,
});

global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'fr-FR',
  rate: 1.0,
})) as any;

describe('UI & Logique : PapierAncreReader (Liseuse Bibliotek & TTS Neurale)', () => {
  const defaultProps = {
    bookUid: 'book_123',
    title: 'Le Chant de la Silice',
    author: 'Oiseau Solitaire',
    authorUid: 'author_456',
    content: 'Ceci est le contenu immersif du manuscrit...',
    writingType: 'Essai',
    style: 'Philosophie',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    mockGetSelection.mockReturnValue({
      isCollapsed: true,
      toString: () => '',
      removeAllRanges: vi.fn(),
    });
  });

  it('🟢 doit rendre l\'interface de base avec les métadonnées et les contrôles de synthèse vocale', () => {
    render(<PapierAncreReader {...defaultProps} />);

    expect(screen.getByText('Le Chant de la Silice')).toBeDefined();
    expect(screen.getByText(/Oiseau Solitaire/)).toBeDefined();
    expect(screen.getByText(/Ceci est le contenu immersif/)).toBeDefined();
    
    expect(screen.getByTestId('tts-play-btn')).toBeDefined();
    expect(screen.getByRole('button', { name: /S'abonner/i })).toBeDefined();
  });

  it('🟢 doit déclencher la lecture audio du manuscrit au clic sur "Écouter"', () => {
    render(<PapierAncreReader {...defaultProps} />);

    const playBtn = screen.getByTestId('tts-play-btn');
    fireEvent.click(playBtn);

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Lecture audio'));
  });

  it('🟢 doit basculer en mode "Immersion Profonde" et masquer la barre d\'outils', () => {
    render(<PapierAncreReader {...defaultProps} />);

    const immersionBtn = screen.getByText(/Immersion Profonde/i);
    expect(immersionBtn).toBeDefined();

    fireEvent.click(immersionBtn);
    expect(screen.queryByText(/Immersion Profonde/i)).toBeNull();

    const exitBtn = screen.getByText(/Quitter l'immersion/i);
    expect(exitBtn).toBeDefined();

    fireEvent.click(exitBtn);
    expect(screen.getByText(/Immersion Profonde/i)).toBeDefined();
  });

  it('🟢 doit ouvrir le OmniActionWidget au clic sur "Actions"', () => {
    render(<PapierAncreReader {...defaultProps} />);

    const actionBtn = screen.getByText(/Actions/i);
    fireEvent.click(actionBtn);

    expect(screen.getByTestId('close-widget-btn')).toBeDefined();
  });

  it('🟢 doit afficher la bulle de surlignage lors d\'une sélection de texte valide', () => {
    render(<PapierAncreReader {...defaultProps} />);

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      toString: () => 'contenu immersif',
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 100, top: 100, width: 50, height: 20 })
      }),
      removeAllRanges: vi.fn(),
    });

    const mainContainer = screen.getByRole('main');
    fireEvent.mouseUp(mainContainer);

    expect(screen.getByText(/Prendre une note/i)).toBeDefined();
  });

  it('🟢 doit permettre de soumettre une annotation (Fulgurance) vers l\'API', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { uid: 'annot_123' } })
    });

    render(<PapierAncreReader {...defaultProps} />);

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      toString: () => 'contenu immersif',
      getRangeAt: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) }),
      removeAllRanges: vi.fn(),
    });
    fireEvent.mouseUp(screen.getByRole('main'));

    fireEvent.click(screen.getByText(/Prendre une note/i));
    expect(screen.getByText(/“contenu immersif”/i)).toBeDefined();

    const textarea = screen.getByPlaceholderText(/Pourquoi ce passage résonne-t-il/i);
    fireEvent.change(textarea, { target: { value: 'Réflexion personnelle très profonde.' } });

    fireEvent.click(screen.getByText(/Sceller la note/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/bibliotek/book_123/annotations`, expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Réflexion personnelle très profonde.')
      }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Codex'));
    });
  });
});