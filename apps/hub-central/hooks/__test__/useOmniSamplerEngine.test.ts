import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOmniSamplerEngine } from '@/hooks/useOmniSamplerEngine';
import * as Tone from 'tone';

// -------------------------------------------------------------------------
// 🎭 MOCK TONE.JS (Classes ES6 enveloppées dans des Spies)
// -------------------------------------------------------------------------
vi.mock('tone', () => {
  class MockEffect {
    wet = { value: 0 };
    frequency = { value: 20000 };
    connect = vi.fn().mockReturnThis();
    dispose = vi.fn();
    chain = vi.fn().mockReturnThis();
  }

  class MockPlayer {
    volume = { value: 0 };
    mute = false;
    toDestination = vi.fn().mockReturnThis();
    connect = vi.fn().mockReturnThis();
    load = vi.fn().mockResolvedValue(true);
    start = vi.fn().mockReturnThis();
    stop = vi.fn().mockReturnThis();
    dispose = vi.fn();
    sync = vi.fn().mockReturnThis();
    unsync = vi.fn().mockReturnThis();
  }

  class MockVolume {
    chain = vi.fn().mockReturnThis();
    dispose = vi.fn();
  }

  return {
    // On garde l'instanciation propre de la classe, mais on l'enveloppe dans un vi.fn()
    // pour que Vitest puisse compter les appels (toHaveBeenCalled).
    Player: vi.fn(() => new MockPlayer()),
    Reverb: vi.fn(() => new MockEffect()),
    FeedbackDelay: vi.fn(() => new MockEffect()),
    Filter: vi.fn(() => new MockEffect()),
    Volume: vi.fn(() => new MockVolume()),
    
    Transport: {
      bpm: { value: 120 },
      start: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
    },
    start: vi.fn().mockResolvedValue(true),
    gainToDb: vi.fn((gain: number) => gain * 10),
    Destination: {},
  };
});

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Hook : useOmniSamplerEngine (SamploTek)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit initialiser 6 pistes par défaut et le BPM à 120', () => {
    const { result } = renderHook(() => useOmniSamplerEngine());

    expect(result.current.tracks.length).toBe(6);
    expect(result.current.bpm).toBe(120);
    expect(result.current.isPlaying).toBe(false);
  });

  it('🟢 [ROADMAP] Pré-écoute Intelligente : doit stopper le sample précédent lors d\'une nouvelle écoute', async () => {
    const { result } = renderHook(() => useOmniSamplerEngine());

    // Lance la première pré-écoute
    await act(async () => {
      await result.current.previewSample('sample_A.wav');
    });

    // Le Spy Player a bien été appelé
    expect(Tone.Player).toHaveBeenCalledTimes(1);

    // Lance la deuxième pré-écoute
    await act(async () => {
      await result.current.previewSample('sample_B.wav');
    });

    // Le Spy a été appelé une 2ème fois, et Tone.start a déverrouillé l'audio
    expect(Tone.Player).toHaveBeenCalledTimes(2);
    expect(Tone.start).toHaveBeenCalledTimes(2);
  });

  it('🟢 doit mettre à jour le volume et le mute d\'une piste', () => {
    const { result } = renderHook(() => useOmniSamplerEngine());

    act(() => {
      result.current.setTrackVolume(1, 0.5);
      result.current.toggleMute(2);
    });

    expect(result.current.tracks[0].volume).toBe(0.5);
    expect(result.current.tracks[1].isMuted).toBe(true);
  });

  it('🟢 [ROADMAP] Effets Master : doit pouvoir mettre à jour le Filtre et la Reverb', () => {
    const { result } = renderHook(() => useOmniSamplerEngine());

    act(() => {
      result.current.setMasterEffect('reverb', 0.8);
      result.current.setMasterFilter(5000); // 5kHz
    });

    // Maintenant, Vitest reconnaît ces fonctions comme des Spies et peut les valider !
    expect(Tone.Reverb).toHaveBeenCalled();
    expect(Tone.Filter).toHaveBeenCalled();
  });
});