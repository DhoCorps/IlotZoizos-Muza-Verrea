import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarterCard } from '@/components/ecommerce/barter/BarterCard';
import React from 'react';

describe('Composant BarterCard', () => {
  const mockOffer = {
    uid: 'barter_123',
    initiatorUid: 'oiseau-alpha',
    offeredProductUids: ['prod_A', 'prod_B'],
    requestedProductUids: ['prod_C'],
  };

  it('doit rendre les informations de l’offre de troc correctement', () => {
    const mockResolve = vi.fn();
    render(<BarterCard offer={mockOffer} onResolve={mockResolve} />);

    expect(screen.getByText('Troc En Attente')).toBeDefined();
    expect(screen.getByText(/oiseau-alpha/)).toBeDefined();
    expect(screen.getByText(/prod_A, prod_B/)).toBeDefined();
    expect(screen.getByText(/prod_C/)).toBeDefined();
  });

  it('doit appeler onResolve avec "ACCEPTED" lors du clic sur Accepter', () => {
    const mockResolve = vi.fn();
    render(<BarterCard offer={mockOffer} onResolve={mockResolve} />);

    const acceptBtn = screen.getByRole('button', { name: /Accepter/i });
    fireEvent.click(acceptBtn);

    expect(mockResolve).toHaveBeenCalledWith('barter_123', 'ACCEPTED');
  });

  it('doit appeler onResolve avec "REJECTED" lors du clic sur Refuser', () => {
    const mockResolve = vi.fn();
    render(<BarterCard offer={mockOffer} onResolve={mockResolve} />);

    const rejectBtn = screen.getByRole('button', { name: /Refuser/i });
    fireEvent.click(rejectBtn);

    expect(mockResolve).toHaveBeenCalledWith('barter_123', 'REJECTED');
  });
});