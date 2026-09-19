import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl'; // 🛡️ AJOUT DU PROVIDER
import AbyssBlogDashboard from '@/app/[locale]/(inceptions)/abyss-blog/page';
import React from 'react';
import { useAbyssBlog } from '@/hooks/useAbyssBlog';

// 🎭 MOCKS GLOBAUX
vi.mock('@/hooks/useAbyssBlog', () => ({
  useAbyssBlog: vi.fn()
}));

vi.mock('@/components/abyss-blog/sujets/SujetForm', () => ({
  SujetForm: ({ onSuccess, onCancel }: any) => (
    <div data-testid="sujet-form">
      <button onClick={onSuccess}>Submit Form</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  )
}));

vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <button data-testid="resonance-btn">Resonance</button>
}));

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: () => <div data-testid="omni-widget">OmniWidget</div>
}));

describe('Page : AbyssBlogDashboard', () => {
  let queryClient: QueryClient;
  const mockDeleteSujet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    
    // Mock de window.confirm pour autoriser la suppression sans bloquer le test
    window.confirm = vi.fn(() => true);

    // Initialisation standard du hook mocké
    (useAbyssBlog as any).mockReturnValue({
      sujets: [
        { uid: 's-1', title: 'Sujet Brouillon', status: 'DRAFT', category: 'DEV', content: 'Ceci est un test' },
        { uid: 's-2', title: 'Sujet Publié', status: 'PUBLISHED', category: 'DESIGN', content: 'Magnifique design' }
      ],
      projects: [],
      loading: false,
      deleteSujet: mockDeleteSujet
    });
  });

  const renderComponent = () => {
    return render(
      // 🛡️ CORRECTION : Enveloppement dans NextIntlClientProvider pour neutraliser l'erreur
      <NextIntlClientProvider locale="fr" messages={{}}>
        <QueryClientProvider client={queryClient}>
          <AbyssBlogDashboard />
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  };

  it('affiche le loader quand les données sont en cours de chargement', () => {
    (useAbyssBlog as any).mockReturnValue({ sujets: [], projects: [], loading: true, deleteSujet: vi.fn() });
    renderComponent();
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  it('affiche la liste des sujets via le hook useAbyssBlog', () => {
    renderComponent();
    expect(screen.getByText('Sujet Brouillon')).toBeDefined();
    expect(screen.getByText('Sujet Publié')).toBeDefined();
  });

  it('filtre les sujets par statut via les boutons', () => {
    renderComponent();
    
    // Filtre 'Publiés'
    const btnPublished = screen.getByText('Publiés');
    fireEvent.click(btnPublished);

    expect(screen.queryByText('Sujet Brouillon')).toBeNull();
    expect(screen.getByText('Sujet Publié')).toBeDefined();
  });

  it('filtre les sujets par recherche de texte', () => {
    renderComponent();
    
    const searchInput = screen.getByPlaceholderText('Rechercher dans la matrice...');
    fireEvent.change(searchInput, { target: { value: 'design' } });

    expect(screen.queryByText('Sujet Brouillon')).toBeNull();
    expect(screen.getByText('Sujet Publié')).toBeDefined();
  });

  it('ouvre la modale de création vide lors du clic sur "Nouveau Monologue"', () => {
    renderComponent();
    
    const createBtn = screen.getByTestId('btn-create-sujet');
    fireEvent.click(createBtn);

    expect(screen.getByText('Inscrire un Nouveau Monologue')).toBeDefined();
    expect(screen.getByTestId('sujet-form')).toBeDefined();
  });

  it('ouvre la modale d\'édition pré-remplie lors du clic sur "Ajuster"', () => {
    renderComponent();
    
    const editBtn = screen.getByTestId('btn-edit-s-1');
    fireEvent.click(editBtn);

    expect(screen.getByText('Ajuster le Monologue')).toBeDefined();
    expect(screen.getByTestId('sujet-form')).toBeDefined();
  });

  it('déclenche la suppression via le hook lors du clic sur "Dissoudre"', () => {
    renderComponent();
    
    const deleteBtn = screen.getByTestId('btn-delete-s-1');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockDeleteSujet).toHaveBeenCalledWith('s-1', expect.any(Object));
  });
});