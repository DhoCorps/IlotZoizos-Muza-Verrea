import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RaffleForm } from '@/components/raffle//RaffleForm';

describe('RaffleForm Component', () => {
  it('doit rendre les champs du formulaire de loterie avec succès', () => {
    render(<RaffleForm onSubmitRaffle={vi.fn()} />);

    expect(screen.getByPlaceholderText('ex: product_uuid_999')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sceller le Destin de la Loterie/i })).toBeDefined();
  });

  it('doit ouvrir la modal d’avertissement sévère lors de la soumission du formulaire', async () => {
    render(<RaffleForm onSubmitRaffle={vi.fn()} />);

    // Remplissage des champs obligatoires via les labels associés
    fireEvent.change(screen.getByLabelText(/UID du Produit Mis en Jeu/i), {
      target: { value: 'product_123' },
    });
    fireEvent.change(screen.getByLabelText(/Date et Heure du Tirage/i), {
      target: { value: '2026-12-31T23:59' },
    });

    // Soumission initiale
    fireEvent.click(screen.getByRole('button', { name: /Sceller le Destin de la Loterie/i }));

    // Vérification de la présence de la phrase gravée dans la Silice
    expect(screen.getByText(/La date est gravée dans la Silice/i)).toBeDefined();
  });

  it('doit exécuter la soumission finale après confirmation dans la modal', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RaffleForm onSubmitRaffle={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/UID du Produit Mis en Jeu/i), {
      target: { value: 'product_123' },
    });
    fireEvent.change(screen.getByLabelText(/Date et Heure du Tirage/i), {
      target: { value: '2026-12-31T23:59' },
    });

    // Déclenchement de la modale
    fireEvent.click(screen.getByRole('button', { name: /Sceller le Destin de la Loterie/i }));

    // Clic sur la confirmation définitive
    fireEvent.click(screen.getByRole('button', { name: /Graver dans la Silice/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        prizeProductUid: 'product_123',
        ticketPriceShards: 10,
        maxTickets: undefined,
        drawDate: '2026-12-31T23:59',
      });
    });
  });
});