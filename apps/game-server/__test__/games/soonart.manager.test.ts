import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoonArtManager } from '../../src/games/soonart/SoonArtManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 40 })
    },
    SoonArtLogic: {
      ...actual.SoonArtLogic,
      generateRandomTreasures: vi.fn().mockReturnValue([
        { id: 't1', position: { x: 100, y: 100 }, isDiscovered: false }
      ])
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('SoonArtManager - Test du Radar Artistique & Séquestre', () => {
  let manager: SoonArtManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new SoonArtManager(mockIo);
  });

  it('🟢 doit créer un salon SoonArt avec options de paris et de séquestre', () => {
    const options = {
      mapWidth: 800,
      mapHeight: 600,
      totalTreasures: 3,
      maxCircles: 10,
      wagerAmount: 15,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'salon_soon_1',
      'Galerie Mystique',
      'curator_1',
      'ArtMaster',
      'socket_a1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('salon_soon_1');
    expect(room.wagerAmount).toBe(15);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un artiste de rejoindre la galerie', () => {
    const options = { 
      mapWidth: 800, 
      mapHeight: 600, 
      totalTreasures: 3, 
      maxCircles: 10 
    };
    
    manager.createRoom('salon_soon_2', 'Exposition Solo', 'c1', 'Curator', 'sock1', options);
    const room = manager.handlePlayerJoin('salon_soon_2', 'PainterTwo', 'sock2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.state).toBe('playing');
  });
});