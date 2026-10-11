import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobQuestFormModal from '@/components/kontakt/JobQuestFormModal';
import React from 'react';

const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant JobQuestFormModal (POST /api/kontakt/quests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit publier une nouvelle quête complète avec les champs unifiés SSOT via POST /api/kontakt/quests', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Quête de recrutement publiée avec succès.',
        data: {
          uid: 'quest_new_01',
          slug: 'paladin-graphe-neo4j',
          title: 'Paladin Graphe Neo4j',
          status: 'ACTIVE'
        }
      })
    });

    const onCreatedMock = vi.fn();
    render(
      <JobQuestFormModal
        isOpen={true}
        onClose={() => {}}
        onCreated={onCreatedMock}
      />
    );

    fireEvent.change(screen.getByLabelText(/Titre de la Quête/i), {
      target: { value: 'Paladin Graphe Neo4j' }
    });
    fireEvent.change(screen.getByLabelText(/Description de la Quête/i), {
      target: { value: 'Sécuriser les transactions hybrides entre MongoDB et Neo4j.' }
    });
    fireEvent.change(screen.getByLabelText(/Nom de la Guilde/i), {
      target: { value: 'Ordre de la Silice' }
    });
    fireEvent.change(screen.getByLabelText(/Compétences Requises/i), {
      target: { value: 'Neo4j, TypeScript' }
    });
    fireEvent.change(screen.getByLabelText(/Prérequis RH/i), {
      target: { value: 'Maîtrise de Cypher' }
    });
    fireEvent.change(screen.getByLabelText(/Récompense XP/i), {
      target: { value: '450' }
    });

    fireEvent.click(screen.getByText(/Publier la Quête/i));

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetchMock.mock.calls[0];
      expect(url).toBe('/api/kontakt/quests');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.title).toBe('Paladin Graphe Neo4j');
      expect(body.company.name).toBe('Ordre de la Silice');
      expect(body.requiredSkills).toEqual(['Neo4j', 'TypeScript']);
      expect(body.requirements).toEqual(['Maîtrise de Cypher']);
      expect(body.rewardXp).toBe(450);
      expect(body.budgetConstraint).toEqual({
        minBudgetCents: 40000,
        maxBudgetCents: 60000
      });
      expect(onCreatedMock).toHaveBeenCalled();
    });
  });

  it('🔴 doit bloquer l’envoi et afficher une alerte en cas d’hérésie mathématique (minBudget > maxBudget)', async () => {
    render(<JobQuestFormModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Titre de la Quête/i), {
      target: { value: 'Quête Illogique' }
    });
    fireEvent.change(screen.getByLabelText(/Description de la Quête/i), {
      target: { value: 'Description valide de plus de dix caractères.' }
    });
    fireEvent.change(screen.getByLabelText(/Budget Min/i), {
      target: { value: '90000' }
    });
    fireEvent.change(screen.getByLabelText(/Budget Max/i), {
      target: { value: '50000' }
    });

    fireEvent.click(screen.getByText(/Publier la Quête/i));

    await waitFor(() => {
      expect(screen.getByText(/Hérésie mathématique/i)).toBeInTheDocument();
      expect(globalFetchMock).not.toHaveBeenCalled();
    });
  });
});