import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('UI & Logique : OmniActionWidget (Commerce, Barter & Résonance)', () => {
  const mockOnClose = vi.fn();
  const mockOnProposeBarter = vi.fn();
  const mockOnAcquire = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('🟢 doit permettre de naviguer entre les onglets et déclencher les actions de Troc (Barter) et d’Acquisition', () => {
    render(
      <OmniActionWidget 
        media={mockMedia} 
        isOpen={true} 
        onClose={mockOnClose}
        onProposeBarter={mockOnProposeBarter}
        onAcquire={mockOnAcquire}
      />
    );
    
    expect(screen.getByText(/Échos et vibrations de la canopée/i)).toBeDefined();

    const commerceBtn = screen.getByText(/Acquérir \/ Troquer/i);
    fireEvent.click(commerceBtn);
    
    expect(screen.getByText('15.00 €')).toBeDefined();
    expect(screen.getByText(/éligible au moteur de troc/i)).toBeDefined();

    const barterBtn = screen.getByText(/Proposer un Troc/i);
    fireEvent.click(barterBtn);
    expect(mockOnProposeBarter).toHaveBeenCalledWith(mockMedia);

    const acquireBtn = screen.getByText(/^Acquérir$/i);
    fireEvent.click(acquireBtn);
    expect(mockOnAcquire).toHaveBeenCalledWith(mockMedia);

    const shareBtn = screen.getByText(/Partage & Droits/i);
    fireEvent.click(shareBtn);
    
    expect(screen.getByText(/Diaporama Universel/i)).toBeDefined();
  });

  it('🟢 doit déclencher onClose lors du clic sur le bouton de fermeture', () => {
    render(<OmniActionWidget media={mockMedia} isOpen={true} onClose={mockOnClose} />);
    
    const closeBtn = screen.getByTestId('close-widget-btn');
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});