import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
// 🪡 FIX : Chemins relatifs corrigés par rapport à __test__/component/
import { LetrinFontProvider, useLetrinFont } from '@/components/letrin/LetrinFontContext';
import { compileAndInjectFont } from '@/utils/letrin-compiler';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// 🛡️ Mock de l'injecteur avec le BON chemin relatif
vi.mock('../../utils/letrin-compiler', () => ({
  compileAndInjectFont: vi.fn()
}));

// 🎭 Composant de test pour consommer et afficher les valeurs du contexte
const TestConsumer = () => {
  const { fonts, activeFont, setActiveFont } = useLetrinFont();
  
  return (
    <div>
      <div data-testid="active-font">{activeFont || 'none'}</div>
      <button onClick={() => setActiveFont('CyberFont')}>Set Font</button>
      <ul data-testid="font-list">
        {fonts.map(f => (
          <li key={f._id}>
            {f.title} - {f.category} - {f.frequencyHz}Hz
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('LetrinFontContext (État Global)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ Sécurité JSDOM : Mocks des fonctions URL manquantes dans l'environnement de test
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();

    // 🌐 Mock de fetch robuste (Typé comme un Response)
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
            tags: ['magie'],
            frequencyHz: 528,
            isFrequencyMuted: false
          }
        ]
      })
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('🟢 Doit charger les polices depuis l\'API, inclure les nouvelles métadonnées (Catégorie, Hz) et compiler', async () => {
    render(
      <LetrinFontProvider>
        <TestConsumer />
      </LetrinFontProvider>
    );

    // Vérifie que l'appel API a bien été déclenché au montage
    expect(global.fetch).toHaveBeenCalledWith('/api/letrin/fonts');

    // Vérifie que les données taxonomiques et alchimiques sont bien propagées
    await waitFor(() => {
      expect(screen.getByText('Alchimia - MECANE - 528Hz')).toBeInTheDocument();
    });

    // Vérifie que le compilateur a bien été appelé avec les données de la police
    expect(compileAndInjectFont).toHaveBeenCalledWith('Alchimia', {}, 16);
  });

  it('🟢 Doit permettre de changer la police active', async () => {
    render(
      <LetrinFontProvider>
        <TestConsumer />
      </LetrinFontProvider>
    );

    const user = userEvent.setup();
    expect(screen.getByTestId('active-font')).toHaveTextContent('none');
    
    // Simule le clic pour changer de police
    const btn = screen.getByText('Set Font');
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('active-font')).toHaveTextContent('CyberFont');
    });
  });
});