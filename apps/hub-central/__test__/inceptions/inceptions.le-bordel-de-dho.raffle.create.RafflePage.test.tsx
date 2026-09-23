import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateRafflePage from '@/app/[locale]/(inceptions)/le-bordel-de-dho/raffle/create/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mocks de Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('CreateRafflePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit rendre le formulaire de création de loterie', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CreateRafflePage />
      </QueryClientProvider>
    );
    expect(screen.getByPlaceholderText('ex: product_uuid_999')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sceller le Destin de la Loterie/i })).toBeDefined();
  });

  it('doit soumettre avec succès et rediriger vers le marketplace après confirmation', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CreateRafflePage />
      </QueryClientProvider>
    );

    // Remplissage des champs via les labels
    fireEvent.change(screen.getByLabelText(/UID du Produit Mis en Jeu/i), {
      target: { value: 'product_test_777' },
    });
    fireEvent.change(screen.getByLabelText(/Date et Heure du Tirage/i), {
      target: { value: '2026-12-31T23:59' },
    });

    // Clic sur le bouton de soumission initial
    fireEvent.click(screen.getByRole('button', { name: /Sceller le Destin de la Loterie/i }));

    // Vérification de la modal d'avertissement sévère
    expect(screen.getByText(/La date est gravée dans la Silice/i)).toBeDefined();

    // Confirmation définitive dans la modal
    fireEvent.click(screen.getByRole('button', { name: /Graver dans la Silice/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/raffles', expect.any(Object));
      expect(mockPush).toHaveBeenCalledWith('/marketplace');
    });
  });
});