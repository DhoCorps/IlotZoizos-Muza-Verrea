// apps/hub-central/components/poetrik/__tests__/PoemCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PoemCard } from '@/components/poetrik/PoemCard';

describe('Composant : PoemCard', () => {
  const defaultProps = {
    uid: 'poem_1',
    title: 'Les Vents',
    content: 'Souffle léger...',
    format: 'FREE_VERSE',
    author: { uid: 'u1', pseudo: 'OiseauLibre' }
  };

  it('🟢 doit afficher le poème et l\'auteur de la Galerie des Visages', () => {
    render(<PoemCard {...defaultProps} />);
    expect(screen.getByText('Les Vents')).toBeDefined();
    expect(screen.getByText('OiseauLibre')).toBeDefined();
    expect(screen.getByText('Souffle léger...')).toBeDefined();
  });

  it('🟢 doit masquer les interactions si le Voile de Catharsis est actif', () => {
    render(<PoemCard {...defaultProps} catharsisVeil={true} />);
    expect(screen.getByText('🛡️ Voile de Catharsis')).toBeDefined();
    expect(screen.getByText(/Le silence entoure ce poème/i)).toBeDefined();
    expect(screen.queryByText(/Déposer une Goutte/i)).toBeNull();
  });

  it('🟢 doit déclencher le transfert vers LyriKa', () => {
    const mockTransfer = vi.fn();
    render(<PoemCard {...defaultProps} onTransferToArena={mockTransfer} />);
    
    const btn = screen.getByText(/Transférer vers LyriKa/i);
    fireEvent.click(btn);
    expect(mockTransfer).toHaveBeenCalledWith('poem_1');
  });
});