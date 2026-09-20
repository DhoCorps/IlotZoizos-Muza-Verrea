import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SujetForm } from '@/components/abyss-blog/sujets/SujetForm';
import React from 'react';

// 🎭 MOCKS GLOBAUX
vi.mock('@/components/auth/RequireCapability', () => ({
  RequireCapability: ({ children }: any) => <>{children}</>
}));

describe('Composant Front-End : SujetForm', () => {
  let queryClient: QueryClient;
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Mock global fetch robuste pour simuler les routes internes (Création ET Upload)
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/taxonomy')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, sujetCategories: [{ value: 'MONOLOGUE', label: 'Monologue' }] })
        });
      }
      if (url.includes('/upload')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { url: 'https://cdn.ilot/file.mp3' } })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ mongo: { uid: 'sujet-test-123' }, success: true })
      });
    }) as any;
  });

  const renderComponent = (initialData?: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SujetForm 
          initialData={initialData}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          userCapabilities={['*']}
          existingProjects={[{ uid: 'p-1', name: 'Projet Alpha' }]}
        />
      </QueryClientProvider>
    );
  };

  it('affiche le formulaire en mode Création par défaut', () => {
    renderComponent();
    expect(screen.getByText('Nouveau Monologue')).toBeDefined();
    expect(screen.getByText('Sceller le Texte')).toBeDefined();
  });

  it('affiche le formulaire en mode Édition si initialData est fourni', () => {
    renderComponent({ uid: 's-1', title: 'Titre Existant', content: 'Contenu' });
    expect(screen.getByText('Ajuster la Pensée')).toBeDefined();
    expect(screen.getByText('Appliquer la Mutation')).toBeDefined();
    expect(screen.getByDisplayValue('Titre Existant')).toBeDefined();
  });

  it('gère correctement le découpage des tags lors de la soumission', async () => {
    renderComponent();
    
    fireEvent.change(screen.getByPlaceholderText('Titre du sujet'), { target: { value: 'Titre Test' } });
    fireEvent.change(screen.getByPlaceholderText("Tags (séparés par des virgules)..."), { target: { value: 'poésie, neo4j , canopée' } });
    fireEvent.change(screen.getByPlaceholderText("Laisse couler l'onde..."), { target: { value: 'Contenu...' } });

    fireEvent.submit(document.getElementById('sujet-form-element')!);

    await waitFor(() => {
      // Vérifie que fetch a été appelé avec les tags nettoyés
      expect(global.fetch).toHaveBeenCalledWith('/api/sujets', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"tags":["poésie","neo4j","canopée"]')
      }));
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('séquence correctement la sédimentation (Création en DB PUIS Upload du fichier)', async () => {
    renderComponent();
    
    fireEvent.change(screen.getByPlaceholderText('Titre du sujet'), { target: { value: 'Mon Nouveau Texte' } });
    fireEvent.change(screen.getByPlaceholderText("Laisse couler l'onde..."), { target: { value: 'Contenu...' } });

    // Simule la sélection d'un fichier
    const file = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/Joindre un fichier/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.submit(document.getElementById('sujet-form-element')!);

    await waitFor(() => {
      // L'appel principal (Création en DB) doit être effectué
      expect(global.fetch).toHaveBeenCalledWith('/api/sujets', expect.any(Object));
      
      // L'appel d'upload doit cibler le véritable UID retourné par la création (sujet-test-123)
      expect(global.fetch).toHaveBeenCalledWith('/api/sujets/sujet-test-123/upload', expect.objectContaining({
        method: 'POST'
      }));
      
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });
});