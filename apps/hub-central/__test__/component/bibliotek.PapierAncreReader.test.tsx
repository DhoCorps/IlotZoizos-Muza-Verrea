import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PapierAncreReader } from '@/components/bibliotek/PapierAncreReader';
import { toast } from 'sonner';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

vi.mock('@/components/resonance/FollowButton', () => ({
  FollowButton: () => <button data-testid="mock-follow-btn">Suivre</button>
}));

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: () => <div data-testid="mock-omni-widget" />
}));

// Mock de l'API SpeechSynthesis (Synthèse vocale)
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
  writable: true
});

global.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = '';
  rate: number = 1;
  onend: () => void = () => {};
  onerror: () => void = () => {};

  constructor(text: string) {
    this.text = text;
  }
} as any;

describe('UI & Logique : PapierAncreReader (Liseuse harmonisée avec Wrapper Universel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit afficher le contenu du manuscrit et ses métadonnées', () => {
    render(
      <PapierAncreReader 
        book={{ 
          uid: 'book_123', 
          title: 'Le Cosmos', 
          authorUid: 'author_1', 
          authorSlug: 'CarlSagan' 
        }} 
        content="Une étoile brille dans le néant." 
      />
    );
    
    expect(screen.getByText('Le Cosmos')).toBeDefined();
    expect(screen.getByText('Par CarlSagan')).toBeDefined();
    expect(screen.getByText('Une étoile brille dans le néant.')).toBeDefined();
  });

  it('🟢 doit lancer la lecture audio si la synthèse vocale est supportée', async () => {
    render(
      <PapierAncreReader 
        book={{ uid: 'book_123', title: 'Le Cosmos', authorUid: 'author_1', authorSlug: 'Carl' }} 
        content="Test audio." 
      />
    );

    const playBtn = await screen.findByTestId('tts-play-btn');
    fireEvent.click(playBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pause')).toBeDefined();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Lecture audio'));
  });
});