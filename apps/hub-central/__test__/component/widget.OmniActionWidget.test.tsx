import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OmniActionWidget } from '@/components/widget/OmniActionWidget';
import { IUniversalMediaItem } from '@ilot/types';
import React from 'react';

// 🌟 Mock d'un objet média utilisant STRICTEMENT les types validés par Zod
const mockMedia: IUniversalMediaItem = {
  mediaId: 'book_123',
  sourceApp: 'BIBLIOTEK', // Validé par le Zod SourceAppEnum
  ownerUid: 'author_uid',
  ownerSlug: 'oiseau_plume',
  title: 'Le Chant de la Silice',
  mediaUrl: 'https://cdn.ilot/cover.jpg',
  thumbnailUrl: 'https://cdn.ilot/thumb.jpg',
  priceCents: 1500, // 15.00 €
  consentForShowcase: true,
  consentForMusicSync: false,
  createdAt: new Date(),
};

describe('UI & Logique : OmniActionWidget', () => {
  const mockOnClose = vi.fn();

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
    
    // Vérifie la présence du tag sourceApp 'BIBLIOTEK' (il apparaît dans le header et le badge)
    expect(screen.getAllByText('BIBLIOTEK').length).toBeGreaterThan(0);
  });

  it('🟢 doit permettre de naviguer entre les onglets (Résonance, Commerce, Partage)', () => {
    render(<OmniActionWidget media={mockMedia} isOpen={true} onClose={mockOnClose} />);
    
    // Par défaut sur RESONANCE
    expect(screen.getByText(/Échos et vibrations de la canopée/i)).toBeDefined();

    // Clic sur COMMERCE
    const commerceBtn = screen.getByText(/Acquérir \/ Troquer/i);
    fireEvent.click(commerceBtn);
    
    expect(screen.getByText('15.00 €')).toBeDefined();
    // 🛠️ CORRECTION : On cherche un texte strictement unique au panneau Commerce pour éviter les doublons
    expect(screen.getByText(/Proposer un Troc/i)).toBeDefined();

    // Clic sur SHARE
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