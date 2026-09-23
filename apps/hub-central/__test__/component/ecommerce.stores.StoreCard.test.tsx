import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreCard } from '@/components/ecommerce/stores/StoreCard';

// Mock de next/link pour les tests unitaires
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Composant StoreCard', () => {
  const mockStore = {
    uid: 'store_1',
    slug: 'ma-boutique',
    storeName: 'La Forge de l’Îlot',
    description: 'Artefacts typographiques rares.',
    isVerified: true,
    stripeAccountId: 'acct_test999',
    ownerUid: 'bird_owner_1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit afficher les informations de la boutique et le lien vers la page de détail', () => {
    render(<StoreCard store={mockStore} />);

    expect(screen.getByText('La Forge de l’Îlot')).toBeDefined();
    expect(screen.getByText('Artefacts typographiques rares.')).toBeDefined();
    expect(screen.getByText('acct_test999')).toBeDefined();

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/stores/ma-boutique');
  });

  it('ne doit pas afficher le bouton de dissolution si l’utilisateur connecté n’est pas le propriétaire', () => {
    render(<StoreCard store={mockStore} currentUser={{ uid: 'stranger_bird', capabilities: [] }} />);
    
    expect(screen.queryByRole('button', { name: /dissoudre/i })).toBeNull();
  });

  it('doit afficher le bouton de dissolution et déclencher l’appel API DELETE si l’utilisateur est propriétaire', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as any);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    const mockOnDissolved = vi.fn();
    render(<StoreCard store={mockStore} currentUser={{ uid: 'bird_owner_1', capabilities: [] }} onDissolved={mockOnDissolved} />);

    const dissolveBtn = screen.getByRole('button', { name: /dissoudre/i });
    expect(dissolveBtn).toBeDefined();

    fireEvent.click(dissolveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ecommerce/stores/ma-boutique', {
        method: 'DELETE',
      });
      expect(mockOnDissolved).toHaveBeenCalledWith('store_1');
    });
  });
});