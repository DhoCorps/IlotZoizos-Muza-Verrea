// apps/hub-central/src/hooks/__tests__/useAlphaTab.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAlphaTab } from '../useAlphaTab';
import { usePartitaStore } from '../../store/partitaStore';

// -------------------------------------------------------------------------
// 🎭 MOCK ROBUSTE D'ALPHATAB VIA UNE CLASSE
// -------------------------------------------------------------------------

const { mockTex, mockLoadBytes, mockDestroy, mockPlayPause, mockStop } = vi.hoisted(() => ({
  mockTex: vi.fn(),
  mockLoadBytes: vi.fn(),
  mockDestroy: vi.fn(),
  mockPlayPause: vi.fn(),
  mockStop: vi.fn(),
}));

vi.mock('@coderline/alphatab', () => ({
  Settings: class {
    player = { enablePlayer: false, soundFont: '' };
    core = { file: '' };
  },
  AlphaTabApi: class {
    playPause = mockPlayPause;
    stop = mockStop;
    playbackSpeed = 1;
    playbackRange = null;
    tex = mockTex;
    loadBytes = mockLoadBytes;
    destroy = mockDestroy;
    
    scoreLoaded = {
      on: vi.fn((cb) => cb({ masterBars: [{ start: 0, calculateDuration: () => 1000 }] }))
    };
    playerStateChanged = { on: vi.fn() };
    playerPositionChanged = { on: vi.fn() };
    error = { on: vi.fn() };
  }
}));

vi.mock('../../store/partitaStore', () => ({
  usePartitaStore: vi.fn(),
}));

// Fonction utilitaire pour simuler l'attachement du ref dans renderHook
function renderAlphaTabHook(props: { fileUrl?: string; rawContent?: string }) {
  return renderHook(() => {
    const hook = useAlphaTab(props);
    if (!hook.containerRef.current) {
      (hook.containerRef as any).current = document.createElement('div');
    }
    return hook;
  });
}

describe('Hook : useAlphaTab', () => {
  const mockSetIsLoaded = vi.fn();
  const mockSetIsPlaying = vi.fn();
  const mockSetCurrentTick = vi.fn();
  const mockSetTotalTicks = vi.fn();
  const mockResetStore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(usePartitaStore).mockReturnValue({
      setIsLoaded: mockSetIsLoaded,
      setIsPlaying: mockSetIsPlaying,
      setCurrentTick: mockSetCurrentTick,
      setTotalTicks: mockSetTotalTicks,
      resetStore: mockResetStore
    } as any);

    global.window.atob = vi.fn().mockReturnValue('mocked-binary-string');
  });

  it('🟢 doit initialiser le moteur avec un fileUrl et notifier le store au chargement', async () => {
    const { result } = renderAlphaTabHook({ fileUrl: 'https://mock.com/file.gp' });

    await waitFor(() => {
      expect(mockSetIsLoaded).toHaveBeenCalledWith(true);
      expect(mockSetTotalTicks).toHaveBeenCalledWith(1000);
    });

    expect(result.current.api).toBeDefined();
  });

  it('🟢 doit initialiser le moteur avec du texte brut (AlphaTex) si aucun fileUrl n\'est fourni', async () => {
    renderAlphaTabHook({ rawContent: '\\title "Test"\n C D E F' });

    await waitFor(() => {
      expect(mockTex).toHaveBeenCalledWith('\\title "Test"\n C D E F');
    });
  });

  it('🟢 doit exécuter les actions de contrôle (playPause, stop, setSpeed)', async () => {
    const { result } = renderAlphaTabHook({ fileUrl: 'test.gp' });

    await waitFor(() => {
      expect(result.current.api).toBeDefined();
    });

    result.current.playPause();
    expect(mockPlayPause).toHaveBeenCalled();

    result.current.stop();
    expect(mockStop).toHaveBeenCalled();

    result.current.setSpeed(1.5);
    expect(result.current.api.playbackSpeed).toBe(1.5);
    expect(result.current.api.playbackRange).toBeNull();
  });

  it('🟢 doit détruire le moteur et nettoyer le store au démontage', async () => {
    const { unmount } = renderAlphaTabHook({ fileUrl: 'test.gp' });

    await waitFor(() => {
      expect(mockSetIsLoaded).toHaveBeenCalled();
    });

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockResetStore).toHaveBeenCalled();
  });
});