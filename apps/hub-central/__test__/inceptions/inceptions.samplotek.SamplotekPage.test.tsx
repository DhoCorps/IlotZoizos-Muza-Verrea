import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SamploTekPage from '@/app/[locale]/(inceptions)/samplotek/page';
import { toast } from 'sonner';
import { useStudioStore } from '@/store/studioStore';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES COMPOSANTS ENFANTS ET HOOKS
// -------------------------------------------------------------------------
vi.mock('@/components/samplotek/SampleLibraryPanel', () => ({
  SampleLibraryPanel: ({ onSelectSample, onOpenUploadModal }: any) => (
    <div data-testid="mock-library-panel">
      <button onClick={() => onSelectSample({ title: 'Mock Sample', audioUrl: 'mock.wav' })}>
        Assigner Mock Sample
      </button>
      <button onClick={onOpenUploadModal}>
        Ouvrir Upload Mock
      </button>
    </div>
  ),
}));

vi.mock('@/components/samplotek/SequencerGrid', () => ({
  SequencerGrid: () => <div data-testid="mock-sequencer-grid">Séquenceur</div>,
}));

vi.mock('@/components/samplotek/SampleUploadModal', () => ({
  SampleUploadModal: ({ isOpen, onClose }: any) => (
    isOpen ? <div data-testid="mock-upload-modal"><button onClick={onClose}>Fermer</button></div> : null
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSetTrackSample = vi.fn();
const mockSetMasterReverb = vi.fn();
const mockSetMasterDelay = vi.fn();

vi.mock('@/store/studioStore', () => ({
  useStudioStore: vi.fn(() => ({
    setTrackSample: mockSetTrackSample,
    tracks: [
      { id: 1, isLocked: false, sampleUrl: null },
      { id: 2, isLocked: false, sampleUrl: 'exist.wav', volume: 0.8, isMuted: false, steps: [] }
    ],
    bpm: 120,
    masterReverb: 0.2,
    masterDelay: 0.1,
    setMasterReverb: mockSetMasterReverb,
    setMasterDelay: mockSetMasterDelay,
  })),
}));

describe('Page : SamploTek Studio Master', () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('prompt', vi.fn(() => 'Projet Test'));

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], message: 'Mixage réussi' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('🟢 doit charger et afficher les composants principaux au montage', async () => {
    render(<SamploTekPage />);

    expect(screen.getByText('SamploTek • Studio E-Jay')).toBeDefined();
    expect(screen.getByTestId('mock-library-panel')).toBeDefined();
    expect(screen.getByTestId('mock-sequencer-grid')).toBeDefined();

    // Vérifie le montage de la roadmap (Master FX)
    expect(screen.getByText('Master FX')).toBeDefined();
    
    // Vérifie l'appel API initial pour charger les samples
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/samplotek/search');
    });
  });

  it('🟢 doit ouvrir la modale d\'upload au clic sur "Importer"', () => {
    render(<SamploTekPage />);
    
    const importBtn = screen.getByText('Importer');
    fireEvent.click(importBtn);

    expect(screen.getByTestId('mock-upload-modal')).toBeDefined();
  });

  it('🟢 doit assigner un sample à une piste via le store Zustand', () => {
    render(<SamploTekPage />);
    
    const assignBtn = screen.getByText('Assigner Mock Sample');
    fireEvent.click(assignBtn);

    expect(mockSetTrackSample).toHaveBeenCalledWith(1, 'mock.wav', 'Mock Sample');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Mock Sample'));
  });

  it('🟢 [ROADMAP] doit modifier les paramètres Master FX', () => {
    render(<SamploTekPage />);
    
    // Recherche des sliders par leur valeur initiale issue du store mocké (20% et 10%)
    const sliders = screen.getAllByRole('slider');
    
    // Slider Reverb
    fireEvent.change(sliders[0], { target: { value: '0.5' } });
    expect(mockSetMasterReverb).toHaveBeenCalledWith(0.5);

    // Slider Delay
    fireEvent.change(sliders[1], { target: { value: '0.3' } });
    expect(mockSetMasterDelay).toHaveBeenCalledWith(0.3);
  });

  it('🟢 doit exporter le projet en incluant les FX globaux', async () => {
    render(<SamploTekPage />);
    
    const exportBtn = screen.getByText("Graver l'Œuvre");
    fireEvent.click(exportBtn);

    expect(window.prompt).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/samplotek/export', expect.objectContaining({ 
        method: 'POST',
        // Vérifie que le payload inclut bien les pistes actives ET les FX !
        body: expect.stringContaining('"fx":{"reverb":0.2,"delay":0.1}') 
      }));
    });

    expect(toast.success).toHaveBeenCalled();
  });
});