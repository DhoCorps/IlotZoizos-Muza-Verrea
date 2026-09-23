import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BarterForm } from '@/components/ecommerce/barter/BarterForm';
import { ecommerce } from '@/lib/apiClient';
import React from 'react';

vi.mock('@/lib/apiClient', () => ({
  ecommerce: {
    proposeBarter: vi.fn(),
  },
}));

describe('Composant BarterForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rendre le formulaire avec tous les champs requis', () => {
    render(<BarterForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    expect(screen.getByText('Proposer un Troc')).toBeDefined();
    expect(screen.getByPlaceholderText('ex: bird-beta')).toBeDefined();
    expect(screen.getByPlaceholderText('ex: prod-1')).toBeDefined();
    expect(screen.getByPlaceholderText('ex: prod-2')).toBeDefined();
  });

  it('doit soumettre le formulaire et appeler proposeBarter avec les bonnes données', async () => {
    vi.mocked(ecommerce.proposeBarter).mockResolvedValueOnce({ success: true } as any);
    render(<BarterForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    // Remplissage des champs
    fireEvent.change(screen.getByPlaceholderText('ex: bird-beta'), { target: { value: 'target_bird' } });
    fireEvent.change(screen.getByPlaceholderText('ex: prod-1'), { target: { value: 'item_offered' } });
    fireEvent.change(screen.getByPlaceholderText('ex: prod-2'), { target: { value: 'item_requested' } });

    // Soumission
    const submitBtn = screen.getByRole('button', { name: /Sceller l'Offre de Troc/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ecommerce.proposeBarter).toHaveBeenCalledWith({
        receiverUid: 'target_bird',
        offeredProductUids: ['item_offered'],
        requestedProductUids: ['item_requested'],
      });
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('doit appeler onClose au clic sur le bouton de fermeture', () => {
    render(<BarterForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    const closeBtn = screen.getByRole('button', { name: /\[ Fermer \]/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});