import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { SampleLibraryPanel } from '@/components/samplotek/SampleLibraryPanel';
import { toast } from 'sonner';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES HOOKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useSampleFilter', () => ({
  useSampleFilter: (samples: any[]) => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filteredSamples: samples,
  }),
}));

const mockSamples = [
  { uid: 'samp_1', title: 'Kick Lourd', tempoBpm: 120, musicalKey: 'C', style: 'Techno' },
];

describe('Composant : SampleLibraryPanel', () => {
  let mockFetch: any;

  // 🛠️ MOCK VITAL : JSDOM ne supporte pas l'API Canvas (getContext)
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
    } as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Action réussie' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('🟢 doit afficher la liste des samples et le visualiseur Canvas', () => {
    render(<SampleLibraryPanel samples={mockSamples} onSelectSample={vi.fn()} onOpenUploadModal={vi.fn()} />);
    
    expect(screen.getByText('Kick Lourd')).toBeDefined();
    expect(screen.getByText('120 BPM')).toBeDefined();
    
    // Vérification de la présence du Canvas natif (Waveform)
    const waveformCanvas = screen.getByTestId('waveform-canvas');
    expect(waveformCanvas).toBeDefined();
  });

  it('🟢 doit appeler l\'API de suppression lors du clic sur la corbeille', async () => {
    const onDeleteMock = vi.fn();
    render(<SampleLibraryPanel samples={mockSamples} onSelectSample={vi.fn()} onOpenUploadModal={vi.fn()} onSampleDeleted={onDeleteMock} />);
    
    const deleteBtn = screen.getByTitle('Dissoudre / Supprimer le sample');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/samplotek/samp_1', expect.objectContaining({ method: 'DELETE' }));
    });

    expect(toast.success).toHaveBeenCalled();
    expect(onDeleteMock).toHaveBeenCalledWith('samp_1');
  });

  it('🟢 [ROADMAP] doit appeler l\'API de signalement lors du clic sur le drapeau', async () => {
    render(<SampleLibraryPanel samples={mockSamples} onSelectSample={vi.fn()} onOpenUploadModal={vi.fn()} />);
    
    const reportBtn = screen.getByTitle('Signaler à la modération');
    fireEvent.click(reportBtn);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/samplotek/samp_1/report', expect.objectContaining({ method: 'POST' }));
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Action réussie'));
  });
});