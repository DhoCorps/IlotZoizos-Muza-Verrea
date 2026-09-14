import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalakTKManager } from '../../src/games/galak-t-k/GalakTKManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 50 })
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('GalakTKManager - Test de la Grille Stellaire & Séquestre', () => {
  let manager: GalakTKManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new GalakTKManager(mockIo);
  });

  it('🟢 doit ouvrir un secteur stellaire Galak-TK avec options de paris', () => {
    const options = {
      gridWidth: 6,
      gridHeight: 6,
      totalStars: 3,
      mode: 'global' as const,
      gridSize: 'small' as const,
      wagerAmount: 25,
      wagerCurrency: 'parchemins',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'sector_1',
      'Nébuleuse Alpha',
      'pilot_1',
      'AstraPilot',
      'socket_p1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('sector_1');
    expect(room.wagerAmount).toBe(25);
    expect(room.wagerCurrency).toBe('parchemins');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un second pilote de rejoindre le secteur', () => {
    const options = { 
      gridWidth: 6, 
      gridHeight: 6, 
      totalStars: 3, 
      mode: 'global' as const,
      gridSize: 'small' as const
    };
    
    manager.createRoom('sector_2', 'Nébuleuse Beta', 'p1', 'Pilot1', 'sock1', options);
    const room = manager.handlePlayerJoin('sector_2', 'Pilot2', 'sock2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.state).toBe('playing');
  });
});