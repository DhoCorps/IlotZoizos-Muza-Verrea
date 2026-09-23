import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreForm } from '@/components/ecommerce/stores/StoreForm';

describe('Composant StoreForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit rendre le formulaire de création de boutique correctement', () => {
    render(<StoreForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    expect(screen.getByText(/Ouvrir une Boutique/i)).toBeDefined();
    expect(screen.getByPlaceholderText('ex: La Forge Typographique')).toBeDefined();
  });

  it('doit afficher un message de succès et déclencher les callbacks lors d’une création réussie', async () => {
    // Simulation d'une réponse positive de la route POST /api/ecommerce/stores[cite: 5]
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "Boutique scellée avec succès dans l'îlot." })
    } as any);

    render(<StoreForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText('ex: La Forge Typographique'), { target: { value: 'Boutique Test' } });
    fireEvent.click(screen.getByRole('button', { name: /Sceller la Boutique/i }));

    await waitFor(() => {
      expect(screen.getByText(/Boutique scellée avec succès/i)).toBeDefined();
    });
  });

  it('doit afficher explicitement l’erreur renvoyée par le backend (ex: douane vibratoire)', async () => {
    // Simulation d'un refus du backend (ex: statut 403 de la douane vibratoire)[cite: 5]
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: "Souveraineté restreinte : Votre fréquence est jugée indésirable. La fondation de boutiques vous est interdite." })
    } as any);

    render(<StoreForm onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText('ex: La Forge Typographique'), { target: { value: 'Boutique Interdite' } });
    fireEvent.click(screen.getByRole('button', { name: /Sceller la Boutique/i }));

    await waitFor(() => {
      expect(screen.getByText(/Souveraineté restreinte : Votre fréquence est jugée indésirable/i)).toBeDefined();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});