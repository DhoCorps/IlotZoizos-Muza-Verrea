import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CVMarketplaceGallery } from '@/components/kontakt/cv-editor/CVMarketPlaceGallery';
import React from 'react';

// 🎭 Mock global de fetch pour simuler le retour de l'API /api/kontakt/templates
const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant CVMarketplaceGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit charger et afficher les templates de CV depuis la Silice avec succès', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'tmpl_123',
            slug: 'parchemin-lumineux',
            title: 'Parchemin Lumineux',
            description: 'Un modèle forgé pour les mages du web.',
            priceShards: 10,
            letrinFontFamily: 'sans',
            authorName: 'Vaelen'
          }
        ]
      })
    });

    const mockOnSelect = vi.fn();
    render(<CVMarketplaceGallery onSelectTemplate={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Parchemin Lumineux')).toBeInTheDocument();
      expect(screen.getByText('Un modèle forgé pour les mages du web.')).toBeInTheDocument();
      expect(screen.getByText('Vaelen')).toBeInTheDocument();
    });
  });

  it('🟢 doit afficher l’état vide si aucun template n’est retourné par l’API', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<CVMarketplaceGallery onSelectTemplate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Aucun modèle public partagé pour l'instant.")).toBeInTheDocument();
    });
  });
});