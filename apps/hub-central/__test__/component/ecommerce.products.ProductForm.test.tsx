import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductForm } from '@/components/ecommerce/products/ProductForm';
import { ecommerce } from '@/lib/apiClient';

// 🛡️ Hoisting du mock pour qu'il soit reconnu comme un espion par Vitest
const { mockCreateProduct } = vi.hoisted(() => ({
  mockCreateProduct: vi.fn().mockResolvedValue({ success: true, productUid: 'prod_1' })
}));

// Utilisation du même chemin alias (@/lib/apiClient) pour éviter les erreurs de résolution de module
vi.mock('@/lib/apiClient', () => ({
  ecommerce: {
    createProduct: mockCreateProduct
  }
}));

describe('Composant ProductForm', () => {
  const mockStores = [{ uid: 'store_1', storeName: 'Boutique Îlot' }];
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, categories: [] })
    }) as any;
  });

  it('doit rendre le formulaire de dépôt avec les boutiques', () => {
    render(<ProductForm stores={mockStores} onSuccess={mockOnSuccess} onClose={mockOnClose} />);
    expect(screen.getByText(/Déposer un Artefact/i)).toBeDefined();
    expect(screen.getByDisplayValue('Boutique Îlot')).toBeDefined();
  });

  it('doit soumettre le produit avec succès en convertissant les prix en centimes et les tags', async () => {
    render(<ProductForm stores={mockStores} onSuccess={mockOnSuccess} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText('ex: Synthétiseur Ancien'), { target: { value: 'Synthétiseur Ancien' } });
    fireEvent.change(screen.getByPlaceholderText('Caractéristiques...'), { target: { value: 'Un son unique.' } });
    fireEvent.change(screen.getByPlaceholderText('synth, analog, vintage'), { target: { value: 'synth, analog' } });
    fireEvent.change(screen.getByPlaceholderText('15.00'), { target: { value: '49.99' } });

    fireEvent.click(screen.getByRole('button', { name: /Ajouter au Catalogue/i }));

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(expect.objectContaining({
        storeUid: 'store_1',
        title: 'Synthétiseur Ancien',
        priceCents: 4999,
        tags: ['synth', 'analog']
      }));
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});