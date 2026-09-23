import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EcommerceEditorPage from '@/app/[locale]/(inceptions)/le-bordel-de-dho/editor/page';
import { useBlockEngine } from '@ilot/shared-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// 🛡️ Mocks globaux
vi.mock('@ilot/shared-core', () => ({
  useBlockEngine: vi.fn(),
  UniversalGridCanvas: () => <div data-testid="grid-canvas">Canvas Modulaire</div>,
}));

vi.mock('@/components/ecommerce/stores/StoreRegistry', () => ({
  storeRegistry: {
    'product-hero': {
      label: 'En-tête Produit',
      renderEditForm: () => <div data-testid="edit-form-hero">Formulaire Hero</div>,
    },
    'product-details': {
      label: 'Spécifications',
      defaultLayout: { x: 0, y: 0, w: 12, h: 3 },
      defaultData: { description: '' },
      renderEditForm: () => <div data-testid="edit-form-details">Formulaire Specs</div>,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Page Éditeur E-Commerce (EcommerceEditorPage)', () => {
  const mockAddBlock = vi.fn();
  const mockSetSelectedBlockId = vi.fn();
  const mockUpdateLayout = vi.fn();
  const mockUpdateData = vi.fn();
  const mockToggleBlock = vi.fn();

  const defaultBlocks = [
    {
      id: 'block-product-hero',
      type: 'product-hero',
      data: { title: 'Artefact Test', priceEUR: 20, priceShards: 100, category: 'LORE' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    vi.mocked(useBlockEngine).mockReturnValue({
      blocks: defaultBlocks,
      selectedBlock: null,
      selectedBlockId: null,
      setSelectedBlockId: mockSetSelectedBlockId,
      updateLayout: mockUpdateLayout,
      updateData: mockUpdateData,
      addBlock: mockAddBlock,
      toggleBlock: mockToggleBlock,
    } as any);
  });

  it('doit rendre l’éditeur avec le canevas et l’état vide du panneau de configuration', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EcommerceEditorPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Éditeur Modulaire de Vitrine')).toBeDefined();
    expect(screen.getByTestId('grid-canvas')).toBeDefined();
    expect(screen.getByText(/Sélectionne un bloc sur le canevas/i)).toBeDefined();
  });

  it('doit afficher le formulaire de configuration si un bloc est sélectionné', () => {
    vi.mocked(useBlockEngine).mockReturnValueOnce({
      blocks: defaultBlocks,
      selectedBlock: defaultBlocks[0], // Le bloc Hero est sélectionné
      selectedBlockId: 'block-product-hero',
      setSelectedBlockId: mockSetSelectedBlockId,
      updateLayout: mockUpdateLayout,
      updateData: mockUpdateData,
      addBlock: mockAddBlock,
      toggleBlock: mockToggleBlock,
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EcommerceEditorPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Config : En-tête Produit')).toBeDefined();
    expect(screen.getByTestId('edit-form-hero')).toBeDefined();
  });

  it('doit appeler addBlock avec un nouveau module "product-details" au clic sur "+ Spécifications"', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EcommerceEditorPage />
      </QueryClientProvider>
    );

    const addSpecBtn = screen.getByRole('button', { name: /\+ Spécifications/i });
    fireEvent.click(addSpecBtn);

    expect(mockAddBlock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'product-details',
      title: 'Spécifications',
      enabled: true,
    }));
  });

  it('doit sédimenter l’artefact avec succès via l’API au clic sur le bouton de sauvegarde', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, productUid: 'prod_123' }),
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EcommerceEditorPage />
      </QueryClientProvider>
    );

    const saveBtn = screen.getByRole('button', { name: /Sédimenter l'Artefact/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ecommerce/products', expect.objectContaining({
        method: 'POST',
      }));
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Artefact e-commerce sédimenté'));
  });

  it('doit afficher une erreur toast si la sédimentation échoue', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Erreur cosmique' }),
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EcommerceEditorPage />
      </QueryClientProvider>
    );

    const saveBtn = screen.getByRole('button', { name: /Sédimenter l'Artefact/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('🔥 Erreur : Erreur cosmique');
    });
  });
});