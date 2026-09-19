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

    // Mock global fetch robuste pour simuler les routes internes
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/taxonomy')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, sujetCategories: [{ value: 'MONOLOGUE', label: 'Monologue' }] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, uid: 'sujet-test-123' })
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

  it('appelle onCancel lors du clic sur le bouton de fermeture', () => {
    renderComponent();
    fireEvent.click(screen.getByText('Refermer le Grimoire'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('soumet correctement le formulaire de création classique', async () => {
    renderComponent();
    
    // Remplissage des champs obligatoires
    fireEvent.change(screen.getByPlaceholderText('Titre du sujet'), { target: { value: 'Mon Nouveau Texte' } });
    fireEvent.change(screen.getByPlaceholderText("Laisse couler l'onde..."), { target: { value: 'Contenu profond...' } });

    // Soumission (le formSubmit intercepte le preventDefault et lance executeSubmit)
    fireEvent.submit(document.getElementById('sujet-form-element')!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/sujets', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Mon Nouveau Texte')
      }));
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('intercepte et gère l\'Alerte Alchimique (Code 422 - MoralChecker)', async () => {
    // 🎭 Modification du mock pour forcer l'Alerte Alchimique
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/taxonomy')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      // Simulation du retour 422 du SujetOrchestrator (MoralChecker)
      return Promise.resolve({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ 
          code: 'ALCHEMICAL_WARNING',
          frequencyHz: 432,
          reason: 'Harmoniques instables.',
          suggestion: 'Essaye cette transmutation :',
          transmutedContent: 'Contenu purifié par la licence poétique'
        })
      });
    }) as any;

    renderComponent();
    
    fireEvent.change(screen.getByPlaceholderText('Titre du sujet'), { target: { value: 'Texte Corrompu' } });
    fireEvent.submit(document.getElementById('sujet-form-element')!);

    // Vérification de l'apparition de l'UI d'Alerte Alchimique
    await waitFor(() => {
      expect(screen.getByText(/Interférence Détectée/i)).toBeDefined();
      expect(screen.getByText(/Contenu purifié par la licence poétique/i)).toBeDefined();
    });

    // 🎭 On re-mock fetch pour simuler le succès après la validation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Clic sur le bouton de Validation de la Licence Poétique
    fireEvent.click(screen.getByText('✨ Valider la licence poétique'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/sujets', expect.objectContaining({
        body: expect.stringContaining('Contenu purifié par la licence poétique')
      }));
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });
});