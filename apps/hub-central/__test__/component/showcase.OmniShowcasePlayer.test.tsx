// apps/hub-central/__test__/component/showcase.OmniShowcasePlayer.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OmniShowcasePlayer } from '@/components/showcase/OmniShowcasePlayer';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

// Mock de Audio pour l'environnement JSDOM
class MockAudio {
  src = '';
  loop = false;
  muted = false;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
}
vi.stubGlobal('Audio', MockAudio);

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: ({ isOpen, onClose, media }: { isOpen: boolean; onClose: () => void; media: { title: string } }) =>
    isOpen ? (
      <div data-testid="omni-action-widget">
        <span>Widget: {media.title}</span>
        <button onClick={onClose}>Fermer Widget</button>
      </div>
    ) : null
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('Composant OmniShowcasePlayer (Diaporama Universel & SSOT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit afficher l’écran d’accueil initial puis charger et afficher les œuvres du flux après clic sur "Entrer dans le Flux"', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            mediaId: 'med_1',
            sourceApp: 'ABYSS',
            ownerUid: 'bird_1',
            ownerSlug: 'vaelen',
            title: 'Chronique de la Silice',
            mediaUrl: 'https://cdn.ilot/abyss-1',
            consentForShowcase: true,
            consentForMusicSync: true,
            createdAt: new Date().toISOString(),
            metadata: {
              content: 'Un texte profond issu de l’Abysse.',
              ambientTrackInfo: {
                title: 'Vibration Alpha',
                mediaUrl: 'https://cdn.ilot/audio/alpha.mp3'
              }
            }
          }
        ]
      })
    });

    renderWithClient(<OmniShowcasePlayer userUid="bird_1" />);

    expect(screen.getByText('Le Diaporama Universel')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Entrer dans le Flux/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledWith('/api/showcase/stream?userUid=bird_1');
      expect(screen.getByText('Un texte profond issu de l’Abysse.')).toBeInTheDocument();
      expect(screen.getByText('Ambiance: Vibration Alpha')).toBeInTheDocument();
    });

    // Ouverture du widget d'interaction
    fireEvent.click(screen.getByText(/Interagir/i));
    expect(screen.getByTestId('omni-action-widget')).toBeInTheDocument();
  });
});