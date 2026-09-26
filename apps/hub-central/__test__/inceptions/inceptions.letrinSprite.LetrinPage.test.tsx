import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LetrInSpritePage from '@/app/[locale]/(inceptions)/letrinSprite/page';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// 🛡️ Mock des composants complexes
vi.mock('@/components/letrin/LetrinEditor', () => ({
  LetrinEditor: ({ onSave }: any) => (
    <div data-testid="mock-editor">
      <button onClick={() => onSave({
        matrices: { 'A': [[{ c: '#000', s: 'full' }]] },
        category: 'FANTAISIE',
        tags: ['pixel'],
        frequencyHz: 528,
        visibility: 'EXCHANGEABLE',
        seo: { metaTitle: 'Test', metaDescription: 'Test' },
        copyrightMetadata: { isExclusiveIlot: true }
      })}>
        Save Mock Font
      </button>
    </div>
  )
}));

vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <div data-testid="mock-resonance" />
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn()
}));

// 🛡️ Mock de notre logique Client-Serveur
const mockSaveMutation = { mutate: vi.fn(), isPending: false };
const mockDeleteMutation = { mutate: vi.fn(), isPending: false, variables: null };

vi.mock('@/app/[locale]/(inceptions)/letrinSprite/useLetrin', () => ({
  useLetrin: vi.fn(() => ({
    fonts: [
      {
        uid: 'f_1',
        name: 'CyberGoth',
        category: 'GOTHIQUE',
        status: 'RELEASED',
        glyphs: [
          { character: 'A', barter: { isBarterable: true } },
          { character: 'B', barter: { isBarterable: true } }
        ]
      }
    ],
    loading: false,
    saveMutation: mockSaveMutation,
    deleteMutation: mockDeleteMutation,
    handleDelete: vi.fn()
  }))
}));

describe('Page : Letr\'In Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 Doit afficher la vitrine Barter si des glyphes sont échangeables', async () => {
    render(<LetrInSpritePage />);
    
    // Le badge indique "2 Glyphes en Troc"
    expect(screen.getByText(/2 Glyphes en Troc/i)).toBeInTheDocument();
    
    // 🪡 FIX : On précise que l'on cherche le <span> (le badge) et non l'<option> du filtre de recherche
    expect(screen.getByText('GOTHIQUE', { selector: 'span' })).toBeInTheDocument();
  });

  it('🟢 Doit ouvrir l\'éditeur et formater les glyphes via le payload Zod à la sauvegarde', async () => {
    render(<LetrInSpritePage />);
    const user = userEvent.setup();

    // Ouvre la création
    await user.click(screen.getByText(/Nouvelle Police/i));
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();

    // Simule la sauvegarde depuis l'éditeur
    await user.click(screen.getByText('Save Mock Font'));

    expect(mockSaveMutation.mutate).toHaveBeenCalledTimes(1);
    const mutationCall = mockSaveMutation.mutate.mock.calls[0][0];

    // Vérification du payload envoyé vers l'API
    expect(mutationCall.payload.category).toBe('FANTAISIE');
    expect(mutationCall.payload.frequencyHz).toBe(528);
    expect(mutationCall.payload.status).toBe('RELEASED');
    
    // Le Barter doit être activé car on a sauvegardé avec visibility: 'EXCHANGEABLE'
    expect(mutationCall.payload.glyphs[0].barter.isBarterable).toBe(true);
  });
});