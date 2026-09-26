import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthorStudioView } from '@/components/bibliotek/AuthorStudioView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

// Mock simple de next/link pour les tests RTL
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

describe('UI & Logique : AuthorStudioView (Studio de l\'Auteur)', () => {
  let queryClient: QueryClient;
  const mockOnEditBook = vi.fn();
  const originalConfirm = window.confirm;

  const mockBooks = [
    {
      uid: 'book_1',
      slug: 'mon-roman-publie',
      title: 'Le Chant des Oiseaux',
      status: 'PUBLISHED',
      writingType: 'roman',
      economy: { priceCents: 1500, barterAllowed: true }
    },
    {
      uid: 'book_2',
      slug: 'mon-essai-brouillon',
      title: 'Réflexions Philosophiques',
      status: 'DRAFT',
      writingType: 'essai'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true); // Accepte les alertes de suppression par défaut

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    window.confirm = originalConfirm; // Restauration du comportement natif
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('🟢 doit afficher l\'état de chargement initial', () => {
    // On simule une promesse qui ne se résout pas immédiatement
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    
    const { container } = renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  it('🟢 doit afficher l\'état vide si l\'auteur n\'a aucun manuscrit', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByText('Aucun manuscrit trouvé dans cette catégorie.')).toBeDefined();
    });
  });

  it('🟢 doit lister les manuscrits récupérés et afficher le lien vers le Codex des Résonances', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockBooks })
    });

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
      expect(screen.getByText('Réflexions Philosophiques')).toBeDefined();
      // Vérification de la présence de la balise d'économie en centimes
      expect(screen.getByText('15.00 €')).toBeDefined();
      expect(screen.getByText('Troc Actif')).toBeDefined();
      
      // 🌟 Vérification de l'intégration de notre nouvelle architecture universelle
      const codexLinks = screen.getAllByText('Codex des Résonances');
      expect(codexLinks.length).toBe(2);
    });
  });

  it('🟢 doit filtrer les manuscrits par statut (DRAFT, PUBLISHED, etc.)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockBooks })
    });

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    });

    // Clic sur le filtre "Brouillons"
    fireEvent.click(screen.getByText('Brouillons'));

    // Seul le brouillon doit rester visible
    expect(screen.getByText('Réflexions Philosophiques')).toBeDefined();
    expect(screen.queryByText('Le Chant des Oiseaux')).toBeNull();

    // Clic sur "Tous" pour réinitialiser
    fireEvent.click(screen.getByText('Tous'));
    expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
  });

  it('🟢 doit filtrer les manuscrits via la barre de recherche', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockBooks })
    });

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Rechercher une œuvre...');
    
    // Recherche par titre
    fireEvent.change(searchInput, { target: { value: 'Chant' } });
    expect(screen.getByText('Le Chant des Oiseaux')).toBeDefined();
    expect(screen.queryByText('Réflexions Philosophiques')).toBeNull();

    // Recherche par type d'écrit (essai)
    fireEvent.change(searchInput, { target: { value: 'essai' } });
    expect(screen.getByText('Réflexions Philosophiques')).toBeDefined();
    expect(screen.queryByText('Le Chant des Oiseaux')).toBeNull();
  });

  it('🟢 doit appeler onEditBook avec l\'objet complet lors du clic sur le bouton éditer', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockBooks })
    });

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-btn-book_1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('edit-btn-book_1'));

    expect(mockOnEditBook).toHaveBeenCalledTimes(1);
    expect(mockOnEditBook).toHaveBeenCalledWith(mockBooks[0]);
  });

  it('🟢 doit ouvrir une confirmation et supprimer l\'ouvrage via l\'API si accepté', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBooks })
      }) // 1er fetch (GET Liste)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      }) // 2ème fetch (DELETE)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockBooks[1]] }) // 3ème fetch (Refetch post-delete)
      }); 

    renderWithClient(<AuthorStudioView currentUserUid="author_123" onEditBook={mockOnEditBook} />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-btn-book_1')).toBeDefined();
    });

    // 1. Clic sur la corbeille
    fireEvent.click(screen.getByTestId('delete-btn-book_1'));

    // 2. Vérification que `window.confirm` a bien été appelé
    expect(window.confirm).toHaveBeenCalledWith("Désintégrer définitivement cet ouvrage du Sanctuaire ?");

    // 3. Vérification de l'appel API DELETE
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bibliotek/mon-roman-publie', expect.objectContaining({
        method: 'DELETE'
      }));
      // 4. Vérification du toast de succès
      expect(toast.success).toHaveBeenCalledWith("L'ouvrage a été réduit en cendres.");
    });
  });
});