import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthorStudioView } from '@/components/bibliotek/AuthorStudioView';
import { ScholarlyNotesSection } from '@/components/bibliotek/ScholarlyNotesSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mocks
const mockQueryClient = new QueryClient();
global.fetch = vi.fn();

describe('UI Bibliotek - Studio de l\'Auteur & Notes d\'Érudits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthorStudioView (Le Tableau de Bord de l\'Auteur)', () => {
    const mockBooks = [
      { uid: 'b1', title: 'Brouillon Secret', status: 'DRAFT', writingType: 'essai', economy: { priceCents: 0 } },
      { uid: 'b2', title: 'Œuvre Maîtresse', status: 'PUBLISHED', writingType: 'roman', economy: { priceCents: 1500, barterAllowed: true } }
    ];

    it('🟢 doit afficher les livres de l\'auteur et gérer le filtrage', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true, json: async () => ({ data: mockBooks })
      });

      render(
        <QueryClientProvider client={mockQueryClient}>
          <AuthorStudioView currentUserUid="author_123" onEditBook={vi.fn()} />
        </QueryClientProvider>
      );

      // Vérifie l'affichage initial
      await waitFor(() => {
        expect(screen.getByText('Brouillon Secret')).toBeDefined();
        expect(screen.getByText('Œuvre Maîtresse')).toBeDefined();
        expect(screen.getByText('15.00 €')).toBeDefined(); // Économie Barter/Gacha visible
        expect(screen.getByText('Troc Actif')).toBeDefined();
      });

      // Clique sur le filtre PUBLISHED
      fireEvent.click(screen.getByText('Publiés'));
      
      // Le brouillon doit disparaître
      expect(screen.queryByText('Brouillon Secret')).toBeNull();
      expect(screen.getByText('Œuvre Maîtresse')).toBeDefined();
    });

    it('🟢 doit permettre le clic sur le bouton d\'édition', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true, json: async () => ({ data: mockBooks })
      });
      const mockOnEdit = vi.fn();

      render(
        <QueryClientProvider client={mockQueryClient}>
          <AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEdit} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const editBtn = screen.getByTestId('edit-btn-b1');
        fireEvent.click(editBtn);
        expect(mockOnEdit).toHaveBeenCalledWith(mockBooks[0]);
      });
    });
  });

  describe('ScholarlyNotesSection (La Section Dorée)', () => {
    const mockHighlights = [
      { uid: 'emo_1', selectedText: 'Le ciel est bleu.', emotion: '🔥', isScholarSealed: true, authorUid: 'userA' },
      { uid: 'emo_2', selectedText: 'La terre est ronde.', emotion: '<(:<', isScholarSealed: false, authorUid: 'userB' }
    ];

    it('🟢 doit afficher uniquement les notes scellées par l\'Érudit', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true, json: async () => ({ data: mockHighlights })
      });

      render(
        <QueryClientProvider client={mockQueryClient}>
          {/* 🌟 Correction : bookSlug remplacé par bookUid */}
          <ScholarlyNotesSection bookUid="book_123" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Notes d'Érudits/i)).toBeDefined();
        // La note scellée est visible
        expect(screen.getByText(/Le ciel est bleu/i)).toBeDefined();
        // La note non scellée est ignorée
        expect(screen.queryByText(/La terre est ronde/i)).toBeNull();
      });
    });

    it('🟢 ne doit rien rendre (null) si aucune note n\'est scellée', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [mockHighlights[1]] }) // Uniquement la note non-scellée
      });

      const { container } = render(
        <QueryClientProvider client={mockQueryClient}>
          {/* 🌟 Correction : bookSlug remplacé par bookUid */}
          <ScholarlyNotesSection bookUid="book_456" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});