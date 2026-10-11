import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktSocialActionsModal from '@/components/kontakt/KontaktSocialActionsModal';
import React from 'react';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant KontaktSocialActionsModal (Endorse, Recommendations, Reviews, Introductions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit apposer un Sceau de Confiance via POST /api/kontakt/endorse', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Sceau de Confiance apposé avec succès.',
        data: { success: true, skill: 'NEO4J' }
      })
    });

    render(
      <KontaktSocialActionsModal
        isOpen={true}
        onClose={() => {}}
        targetUid="bird_target_1"
        targetName="Vaelen"
        initialTab="endorse"
      />
    );

    fireEvent.change(screen.getByLabelText(/Compétence à sceller/i), {
      target: { value: 'NEO4J' }
    });
    fireEvent.change(screen.getByLabelText(/Commentaire du Sceau/i), {
      target: { value: 'Maîtrise remarquable des graphes.' }
    });

    fireEvent.click(screen.getByText(/Transmettre au Graphe/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/endorse');
      expect(JSON.parse(options.body)).toEqual({
        targetUid: 'bird_target_1',
        skillName: 'NEO4J',
        comment: 'Maîtrise remarquable des graphes.'
      });
    });
  });

  it('🟢 doit enregistrer une Recommandation (Vouches For) via POST /api/kontakt/recommendations', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Recommandation enregistrée avec succès.',
        data: { success: true, skill: 'TYPESCRIPT' }
      })
    });

    render(
      <KontaktSocialActionsModal
        isOpen={true}
        onClose={() => {}}
        targetUid="bird_target_1"
      />
    );

    fireEvent.click(screen.getByText(/Vouch/i));

    fireEvent.change(screen.getByLabelText(/Domaine de Recommandation/i), {
      target: { value: 'TYPESCRIPT' }
    });
    fireEvent.change(screen.getByLabelText(/Témoignage de Recommandation/i), {
      target: { value: 'Code d’une propreté chirurgicale.' }
    });

    fireEvent.click(screen.getByText(/Transmettre au Graphe/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/recommendations');
      expect(JSON.parse(options.body)).toEqual({
        targetUid: 'bird_target_1',
        skill: 'TYPESCRIPT',
        comment: 'Code d’une propreté chirurgicale.'
      });
    });
  });

  it('🟢 doit consigner un Avis post-collaboration via POST /api/kontakt/reviews', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Avis consigné avec succès dans la matrice.',
        data: { success: true, status: 'REVIEW_PUBLISHED' }
      })
    });

    render(
      <KontaktSocialActionsModal
        isOpen={true}
        onClose={() => {}}
        targetUid="bird_target_1"
      />
    );

    fireEvent.click(screen.getByText(/Avis/i));

    fireEvent.change(screen.getByLabelText(/Note de Collaboration/i), {
      target: { value: '5' }
    });
    fireEvent.change(screen.getByLabelText(/Avis détaillé après mission/i), {
      target: { value: 'Collaboration fluide et livrables impeccables.' }
    });

    fireEvent.click(screen.getByText(/Transmettre au Graphe/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/reviews');
      expect(JSON.parse(options.body)).toEqual({
        targetUid: 'bird_target_1',
        rating: 5,
        comment: 'Collaboration fluide et livrables impeccables.'
      });
    });
  });

  it('🟢 doit demander une Passerelle via POST /api/kontakt/introductions', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Demande de passerelle tissée et transmise à l’intermédiaire avec succès.',
        data: { success: true, status: 'PENDING' }
      })
    });

    render(
      <KontaktSocialActionsModal
        isOpen={true}
        onClose={() => {}}
        targetUid="bird_target_1"
      />
    );

    fireEvent.click(screen.getByText(/Passerelle/i));

    fireEvent.change(screen.getByLabelText(/UID ou Slug de l'Oiseau Intermédiaire/i), {
      target: { value: 'bird_inter_01' }
    });
    fireEvent.change(screen.getByLabelText(/Message d'accompagnement pour la Passerelle/i), {
      target: { value: 'Peux-tu me présenter Vaelen pour notre chantier Neo4j ?' }
    });

    fireEvent.click(screen.getByText(/Transmettre au Graphe/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/introductions');
      expect(JSON.parse(options.body)).toEqual({
        intermediaryUid: 'bird_inter_01',
        targetUid: 'bird_target_1',
        message: 'Peux-tu me présenter Vaelen pour notre chantier Neo4j ?'
      });
    });
  });
});