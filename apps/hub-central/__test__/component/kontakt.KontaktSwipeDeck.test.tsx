import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktSwipeDeck from '@/components/kontakt/KontaktSwipeDeck';
import React from 'react';

// 🎭 Mock global de fetch pour simuler les routes API de Kontakt
const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant KontaktSwipeDeck (SSOT Unifiée)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit charger et afficher les profils depuis l’API en mode recruteur', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'kontakt_profile_1',
            userUid: 'bird_test_1',
            name: 'Oiseau Test',
            professionalTitle: 'Mage React',
            archetypeClass: 'Architecte',
            alignment: 'CHAOTIC_GOOD',
            level: 5,
            skills: ['React'],
            attributes: { force: 10, agilite: 10, intelligence: 10, charisme: 10, empathieVoightKampff: 50 },
            biographyLore: 'Un test unitaire vivant.',
            availabilityStatus: 'OPEN_TO_WORK'
          }
        ]
      })
    });

    render(<KontaktSwipeDeck />);

    await waitFor(() => {
      expect(screen.getByText('Oiseau Test')).toBeInTheDocument();
      expect(screen.getByText('Mage React')).toBeInTheDocument();
    });
  });

  it('🟢 doit envoyer le payload enrichi avec matchmakingData et cibler userUid lors d’un LIKE en mode recruteur sans faux positif de Match', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'kontakt_doc_1',
            userUid: 'bird_test_1',
            name: 'Oiseau Test',
            professionalTitle: 'Mage React',
            skills: ['React'],
            requiredSkills: ['React'],
            requirements: ['TypeScript'],
            budgetConstraint: { minBudgetCents: 30000, maxBudgetCents: 55000 },
            experienceLevel: 'SENIOR',
            attributes: { force: 10, agilite: 10, intelligence: 10, charisme: 10, empathieVoightKampff: 50 },
          }
        ]
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { match: false } })
    });

    render(<KontaktSwipeDeck />);

    await waitFor(() => {
      expect(screen.getByText('Oiseau Test')).toBeInTheDocument();
    });

    // Clic sur le bouton Like (Résonner)
    const likeButton = screen.getByTitle('Résonner (Like)');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
      const postCall = globalFetchMock.mock.calls[1];
      expect(postCall[0]).toBe('/api/kontakt/swipes');
      const requestBody = JSON.parse(postCall[1].body);
      expect(requestBody.targetUid).toBe('bird_test_1'); // 🎯 Cible bien userUid !
      expect(requestBody.action).toBe('LIKE');
      expect(requestBody.matchmakingData).toBeDefined();
      expect(requestBody.matchmakingData.questRequiredSkills).toContain('React');
      expect(requestBody.matchmakingData.questRequirements).toContain('TypeScript');
      expect(requestBody.matchmakingData.questBudgetConstraint).toEqual({
        minBudgetCents: 30000,
        maxBudgetCents: 55000
      });
    });

    // 🛡️ Vérifie que la modale "Résonance Totale !" ne s'ouvre PAS quand match === false
    expect(screen.queryByText('Résonance Totale !')).not.toBeInTheDocument();
  });

  it('🛡️ ne doit PAS appeler /api/kontakt/quests/apply lors d’un PASS en Mode Chercheur (candidate)', async () => {
    // 1. Chargement initial en mode recruteur
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<KontaktSwipeDeck />);

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    // 2. Passage en Mode Chercheur -> Chargement des quêtes
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          uid: 'quest_001',
          title: 'Quête de la Canopée',
          description: 'Refondre le routeur Neo4j',
          company: { name: 'Guilde des Zoizos' },
          rewardXp: 350,
          questDifficulty: 'HARD',
          dangerLevel: 60,
          requirements: ['Neo4j', 'Cypher'],
          perks: ['Café infini']
        }
      ])
    });

    fireEvent.click(screen.getByText(/Mode Chercheur/i));

    await waitFor(() => {
      expect(screen.getByText('Quête de la Canopée')).toBeInTheDocument();
      expect(screen.getByText('Guilde des Zoizos')).toBeInTheDocument();
      expect(screen.getByText('+350 XP')).toBeInTheDocument();
    });

    const callsBeforePass = globalFetchMock.mock.calls.length;

    // 3. Clic sur PASS (X) -> Aucun appel API ne doit partir !
    const passButton = screen.getByTitle('Rejeter (Pass)');
    fireEvent.click(passButton);

    expect(globalFetchMock.mock.calls.length).toBe(callsBeforePass);
  });

  it('🟢 doit envoyer { targetUid, coverMessage } à /api/kontakt/quests/apply lors d’un LIKE en Mode Chercheur', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<KontaktSwipeDeck />);

    await waitFor(() => {
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          uid: 'quest_apply_01',
          title: 'Architecte Graphe',
          description: 'Optimiser les transactions hybrides.'
        }
      ])
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Candidature transmise et enregistrée avec succès pour cette quête.',
        data: { success: true, status: 'APPLICATION_SENT', targetUid: 'quest_apply_01' }
      })
    });

    fireEvent.click(screen.getByText(/Mode Chercheur/i));

    await waitFor(() => {
      expect(screen.getByText('Architecte Graphe')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Présente ton profil/i);
    fireEvent.change(textarea, { target: { value: 'Prêt à sceller le graphe !' } });

    const likeButton = screen.getByTitle('Résonner (Like)');
    fireEvent.click(likeButton);

    await waitFor(() => {
      const lastCall = globalFetchMock.mock.calls[globalFetchMock.mock.calls.length - 1];
      expect(lastCall[0]).toBe('/api/kontakt/quests/apply');
      const body = JSON.parse(lastCall[1].body);
      expect(body).toEqual({
        targetUid: 'quest_apply_01',
        coverMessage: 'Prêt à sceller le graphe !'
      });
    });
  });
});