import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KontaktSwipeDeck from '@/components/kontakt/KontaktSwipeDeck';
import React from 'react';

// 🎭 Mock global de fetch pour simuler les routes API de Kontakt
const globalFetchMock = vi.fn();
vi.stubGlobal('fetch', globalFetchMock);

describe('Composant KontaktSwipeDeck', () => {
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
            uid: 'bird_test_1',
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

  it('🟢 doit envoyer le payload enrichi avec matchmakingData lors d’un LIKE', async () => {
    globalFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'bird_test_1',
            name: 'Oiseau Test',
            professionalTitle: 'Mage React',
            skills: ['React'],
            requiredSkills: ['React'], // 👈 Ajouté ici pour que le tableau ne soit pas vide !
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
      expect(requestBody.action).toBe('LIKE');
      expect(requestBody.matchmakingData).toBeDefined();
      expect(requestBody.matchmakingData.questRequiredSkills).toContain('React');
    });
  });
});