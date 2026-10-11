import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CVMarketplaceGallery } from '@/components/kontakt/cv-editor/CVMarketPlaceGallery';
import React from 'react';

// 🎭 Mock global de fetch pour simuler le retour de l'API /api/kontakt/templates
const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant CVMarketplaceGallery (SSOT & Gestion R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit charger et afficher les templates de CV depuis la Silice avec succès (incluant tags et barterAccepted)', async () => {
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
            barterAccepted: true,
            letrinFontFamily: 'sans',
            tags: ['neo4j', 'cyberpunk'],
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
      expect(screen.getByText('Troc Ouvert')).toBeInTheDocument();
      expect(screen.getByText('neo4j')).toBeInTheDocument();
      expect(screen.getByText('cyberpunk')).toBeInTheDocument();
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

  it('🟢 doit publier un nouveau parchemin via POST /api/kontakt/templates', async () => {
    globalFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Modèle de CV sédimenté et publié comme artefact.',
          data: {
            uid: 'tmpl_new',
            slug: 'parchemin-selenite',
            title: 'Parchemin Sélénite',
            description: 'Forgé sous la lune.',
            priceShards: 25,
            barterAccepted: true,
            letrinFontFamily: 'mono',
            tags: ['silice', 'lune'],
            authorName: 'Vaelen'
          }
        })
      });

    render(<CVMarketplaceGallery onSelectTemplate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Forger un Parchemin/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Forger un Parchemin/i));

    fireEvent.change(screen.getByLabelText(/Titre du Parchemin/i), {
      target: { value: 'Parchemin Sélénite' }
    });
    fireEvent.change(screen.getByLabelText(/Tags cosmétiques/i), {
      target: { value: 'silice, lune' }
    });

    fireEvent.click(screen.getByText(/Publier le Parchemin/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
      const postCall = globalFetchMock.mock.calls[1];
      expect(postCall[0]).toBe('/api/kontakt/templates');
      expect(postCall[1].method).toBe('POST');
      const body = JSON.parse(postCall[1].body);
      expect(body.title).toBe('Parchemin Sélénite');
      expect(body.tags).toEqual(['silice', 'lune']);
      expect(screen.getByText('Parchemin Sélénite')).toBeInTheDocument();
    });
  });

  it('🟢 doit modifier (PUT) et dissoudre (DELETE) un parchemin via /api/kontakt/templates/[slug]', async () => {
    globalFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              uid: 'tmpl_123',
              slug: 'parchemin-lumineux',
              title: 'Parchemin Lumineux',
              description: 'Initial',
              priceShards: 10,
              authorUid: 'bird_1',
              authorName: 'Vaelen'
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Le parchemin a muté avec succès.',
          data: {
            uid: 'tmpl_123',
            slug: 'parchemin-lumineux',
            title: 'Parchemin Muté',
            description: 'Initial',
            priceShards: 10,
            authorUid: 'bird_1',
            authorName: 'Vaelen'
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Le template a été désintégré de la matrice.'
        })
      });

    render(<CVMarketplaceGallery onSelectTemplate={() => {}} currentUserUid="bird_1" />);

    await waitFor(() => {
      expect(screen.getByText('Parchemin Lumineux')).toBeInTheDocument();
    });

    // 1. Édition (PUT)
    fireEvent.click(screen.getByTitle('Modifier Parchemin Lumineux'));
    fireEvent.change(screen.getByLabelText(/Titre du Parchemin/i), {
      target: { value: 'Parchemin Muté' }
    });
    fireEvent.click(screen.getByText(/Enregistrer la Mutation/i));

    await waitFor(() => {
      expect(screen.getByText('Parchemin Muté')).toBeInTheDocument();
    });

    // 2. Suppression (DELETE)
    fireEvent.click(screen.getByTitle('Dissoudre Parchemin Muté'));

    await waitFor(() => {
      expect(screen.queryByText('Parchemin Muté')).not.toBeInTheDocument();
    });
  });

  it('🟢 doit téléverser (POST) et purger (DELETE) un aperçu R2 sur /api/kontakt/templates/[slug]/upload', async () => {
    globalFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              uid: 'tmpl_r2',
              slug: 'parchemin-r2',
              title: 'Parchemin R2',
              priceShards: 0,
              authorUid: 'bird_1',
              authorName: 'Vaelen'
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Parchemin scellé.',
          data: {
            url: 'https://cdn.ilot/preview.png',
            digitalSignature: 'a'.repeat(64)
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Parchemin désintégré du Nexus.'
        })
      });

    render(<CVMarketplaceGallery onSelectTemplate={() => {}} currentUserUid="bird_1" />);

    await waitFor(() => {
      expect(screen.getByText('Parchemin R2')).toBeInTheDocument();
    });

    // 1. Upload R2
    const fileInput = screen.getByLabelText('Téléverser un aperçu pour Parchemin R2');
    const file = new File(['image-bytes'], 'preview.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Parchemin R2')).toHaveAttribute('src', 'https://cdn.ilot/preview.png');
      expect(screen.getByText('SHA-256')).toBeInTheDocument();
    });

    // 2. Purge R2
    fireEvent.click(screen.getByTitle("Purger l'aperçu R2"));

    await waitFor(() => {
      expect(screen.queryByAltText('Parchemin R2')).not.toBeInTheDocument();
    });
  });
});