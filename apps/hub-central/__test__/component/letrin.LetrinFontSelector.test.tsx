import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LetrinFontSelector } from '@/components/letrin/LetrinFontSelector';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// 🛡️ Mocks
vi.mock('@/utils/letrin-compiler', () => ({
  compileAndInjectFont: vi.fn()
}));

// 🪡 FIX : On retourne directement `null` plutôt que de jeter une erreur qui perturbe l'arbre React
vi.mock('@/components/letrin/LetrinFontContext', () => ({
  useLetrinFont: vi.fn(() => null) 
}));

describe('LetrinFontSelector (Sélecteur & Filtres)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mocks JSDOM pour les manipulations de Blob
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();

    // 🌐 Mock de fetch renvoyant des polices avec les métadonnées alchimiques
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: [
          {
            _id: 'f_1',
            title: 'Alchimia',
            resolution: 16,
            license: 'MIT',
            matrices: {},
            category: 'MECANE',
            tags: [],
            frequencyHz: 528,
            isFrequencyMuted: false
          },
          {
            _id: 'f_2',
            title: 'SilentGoth',
            resolution: 16,
            license: 'MIT',
            matrices: {},
            category: 'GOTHIQUE',
            tags: [],
            frequencyHz: 432,
            isFrequencyMuted: true
          }
        ]
      })
    } as Response);
  });

  it('🟢 Doit récupérer les polices locales et afficher les badges de fréquence (🎵/🔇)', async () => {
    render(<LetrinFontSelector />);

    // 🪡 FIX : findByRole attend intelligemment que les options asynchrones soient injectées dans le DOM
    const alchimiaOption = await screen.findByRole('option', { name: /Alchimia/ });
    expect(alchimiaOption).toHaveTextContent('🎵 528Hz');

    const gothOption = await screen.findByRole('option', { name: /SilentGoth/ });
    expect(gothOption).toHaveTextContent('🔇');
  });

  it('🟢 Doit filtrer les polices en fonction de la catégorie sélectionnée', async () => {
    render(<LetrinFontSelector />);
    const user = userEvent.setup();

    // On attend que les données soient chargées
    await screen.findByRole('option', { name: /Alchimia/ });

    // On cible le premier select (qui est le filtre de catégorie)
    const selects = screen.getAllByRole('combobox');
    const filterSelect = selects[0];

    // On applique le filtre GOTHIQUE
    await user.selectOptions(filterSelect, 'GOTHIQUE');

    // La police Gothique reste visible
    expect(screen.getByRole('option', { name: /SilentGoth/ })).toBeInTheDocument();
    // La police Mécane (Alchimia) disparaît
    expect(screen.queryByRole('option', { name: /Alchimia/ })).not.toBeInTheDocument();
  });
  
  it('🟢 Doit permettre l\'importation d\'une police externe (.ttf)', async () => {
    const mockOnSelect = vi.fn();
    render(<LetrinFontSelector onFontSelect={mockOnSelect} />);
    const user = userEvent.setup();

    // Simulation d'un fichier .ttf
    const file = new File(['dummy font data'], 'MaPoliceCustom.ttf', { type: 'font/ttf' });
    const fileInput = screen.getByTestId('external-font-upload');

    await user.upload(fileInput, file);

    await waitFor(() => {
      // Vérifie que l'URL a bien été créée pour l'injection CSS
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      // Vérifie que le callback de sélection a été déclenché avec le nom propre
      expect(mockOnSelect).toHaveBeenCalledWith('MaPoliceCustom');
    });
  });
});