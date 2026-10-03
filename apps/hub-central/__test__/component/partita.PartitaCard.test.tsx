// Fichier : apps/hub-central/src/components/partita/__tests__/PartitaCard.test.tsx
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PartitaCard } from '@/components/partita/PartitaCard';

// -------------------------------------------------------------------------
// 🎭 MOCK DE NEXT-INTL NAVIGATION
// -------------------------------------------------------------------------
vi.mock('../../navigation', () => ({
  Link: ({ children, href, className }: any) => (
    <a href={href.pathname || href} className={className}>{children}</a>
  )
}));

describe('PartitaCard Component', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockPartition = {
    uid: 'partita-123',
    slug: 'ma-partition',
    title: 'Symphonie Test',
    status: 'PUBLISHED',
    instrument: 'PIANO',
    format: 'ABC',
    tuning: 'Standard',
    content: 'C D E F G',
    // 🚀 Sceau Cryptographique avec rôle
    cryptoSeal: {
      digitalSignature: 'mock-sha256-hash',
      copyrightMetadata: {
        role: 'SUBLIMATOR'
      }
    },
    media: {
      audioTrackUrl: 'https://cdn.ilot.com/audio.mp3'
    }
  };

  it('🟢 doit afficher les informations de base de la partition', () => {
    render(<PartitaCard partition={mockPartition} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('Symphonie Test')).toBeInTheDocument();
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('🎸 PIANO')).toBeInTheDocument();
    expect(screen.getByText('C D E F G')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument(); // Accordage
    expect(screen.getByText('Audio lié')).toBeInTheDocument(); // Média
  });

  it('🟢 doit afficher le badge du Sceau Cryptographique et le rôle approprié', () => {
    render(<PartitaCard partition={mockPartition} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    // Vérifie que le composant a bien lu `cryptoSeal.copyrightMetadata.role` et l'a traduit
    expect(screen.getByText('Sublimateur')).toBeInTheDocument();
    expect(screen.getByTitle('Sceau Cryptographique SHA-256 Actif')).toBeInTheDocument();
  });

  it('🟢 doit déclencher onEdit au clic sur le bouton Ajuster', () => {
    render(<PartitaCard partition={mockPartition} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    const editButton = screen.getByTitle('Ajuster');
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockPartition);
  });

  it('🟢 doit déclencher onDelete au clic sur le bouton Dissoudre en transmettant l\'UID', () => {
    render(<PartitaCard partition={mockPartition} onEdit={mockOnEdit} onDelete={mockOnDelete} />);
    
    const deleteButton = screen.getByTitle('Dissoudre');
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('partita-123');
  });
});