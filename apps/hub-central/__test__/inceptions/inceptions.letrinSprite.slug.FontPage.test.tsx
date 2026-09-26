import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LetrInDetailPage from '@/app/[locale]/(inceptions)/letrinSprite/[slug]/page';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// 🛡️ Mocks globaux (Correction du chemin vers @/components/observatory/Constellation3D)
vi.mock('@/components/observatory/Constellation3D', () => ({
  default: () => <div data-testid="mock-constellation" />
}));

vi.mock('@/components/observatory/RegistreDesEchos', () => ({
  default: () => <div data-testid="mock-echos" />
}));

vi.mock('@/components/resonance/ResonanceDrawer', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="mock-resonance-drawer" /> : null
}));

// 🌀 Instance de QueryClient dédiée aux tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Page : Letr\'In Detail View ([slug])', () => {
  const mockParams = Promise.resolve({ slug: 'canopy-sans', locale: 'fr' });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    // 🌐 Mock fetch pour le détail de la police et la constellation
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/constellation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ nodes: [], links: [] })
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          uid: 'font_123',
          name: 'Canopy Sans',
          category: 'LINEALE',
          frequencyHz: 432,
          authorUid: 'author_99',
          digitalSignature: 'abc123sha256',
          copyrightMetadata: { license: 'Libre', isExclusiveIlot: true }
        })
      } as Response);
    });
  });

  it('🟢 Doit charger la police et afficher ses métadonnées et la constellation', async () => {
    renderWithClient(<LetrInDetailPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Canopy Sans')).toBeInTheDocument();
      expect(screen.getByText('🔮 432 Hz')).toBeInTheDocument();
      expect(screen.getByTestId('mock-constellation')).toBeInTheDocument();
      expect(screen.getByTestId('mock-echos')).toBeInTheDocument();
    });
  });

  it('🟢 Doit basculer vers le Mode Manifeste / Poétique lors du clic', async () => {
    renderWithClient(<LetrInDetailPage params={mockParams} />);
    const user = userEvent.setup();

    const input = await screen.findByPlaceholderText('Tape ton texte ici...');
    const defaultText = input.getAttribute('value');

    const poeticButton = screen.getByText(/Mode Manifeste \/ Poétique/i);
    await user.click(poeticButton);

    // Le texte de l'input doit basculer vers un fragment philosophique
    expect(input.getAttribute('value')).not.toBe(defaultText);
    expect(input.getAttribute('value')).toContain('—');
  });
});