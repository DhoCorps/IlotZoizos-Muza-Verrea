import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { IUniversalMediaItem } from '@ilot/types';
import React from 'react';

const mockMedia: IUniversalMediaItem = {
  mediaId: 'book_123',
  sourceApp: 'BIBLIOTEK',
  ownerUid: 'author_uid',
  ownerSlug: 'oiseau_plume',
  title: 'Le Chant de la Silice',
  mediaUrl: 'https://cdn.ilot/cover.jpg',
  thumbnailUrl: 'https://cdn.ilot/thumb.jpg',
  priceCents: 1500,
  consentForShowcase: true,
  consentForMusicSync: false,
  createdAt: new Date(),
  rights: {
    allowBarter: true,
    allowLending: true,
  },
} as any;

describe('UI & Logique : OmniActionWidget (Commerce, Barter, Résonance & Murmurer)', () => {
  const mockOnClose = vi.fn();
  const mockOnProposeBarter = vi.fn();
  const mockOnAcquire = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/network/search-friends')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [{ uid: 'friend_1', matchPseudo: 'Plume Sereine' }]
          })
        };
      }
      if (typeof url === 'string' && url.includes('/api/network/whisper')) {
        return {
          ok: true,
          json: async () => ({ success: true })
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    }) as any;
  });

  it('🔴 ne doit rien rendre si isOpen est false', () => {
    const { container } = render(
      <OmniActionWidget media={mockMedia} isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('🟢 doit afficher les métadonnées du média (Titre, Auteur, Source)', () => {
    render(<OmniActionWidget media={mockMedia} isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Le Chant de la Silice')).toBeDefined();
    expect(screen.getByText(/oiseau_plume/)).toBeDefined();
    expect(screen.getAllByText('BIBLIOTEK').length).toBeGreaterThan(0);
  });

  it('🟢 doit permettre de naviguer vers l’onglet Murmurer, rechercher un ami et envoyer un murmure', async () => {
    render(
      <OmniActionWidget 
        media={mockMedia} 
        isOpen={true} 
        onClose={mockOnClose}
      />
    );
    
    // Basculer sur l'onglet Murmurer
    const whisperTab = screen.getByText('Murmurer');
    fireEvent.click(whisperTab);

    // Saisir dans la recherche d'amis
    const searchInput = screen.getByPlaceholderText('Rechercher par pseudo...');
    fireEvent.change(searchInput, { target: { value: 'Plume' } });

    // Attendre l'affichage de l'ami trouvé via l'API simulée
    const friendOption = await screen.findByText('@Plume Sereine');
    expect(friendOption).toBeDefined();

    // Sélectionner l'ami
    fireEvent.click(friendOption);

    // Cliquer sur le bouton d'envoi du murmure
    const sendButton = screen.getByRole('button', { name: /Murmurer à la Nuée/i });
    expect(sendButton.getAttribute('disabled')).toBeNull();

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/network/whisper', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('friend_1')
      }));
      expect(screen.getByText(/Murmure transmis avec succès/i)).toBeDefined();
    });
  });

  it('🟢 doit déclencher onClose lors du clic sur le bouton de fermeture', () => {
    render(<OmniActionWidget media={mockMedia} isOpen={true} onClose={mockOnClose} />);
    
    const closeBtn = screen.getByTestId('close-widget-btn');
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});