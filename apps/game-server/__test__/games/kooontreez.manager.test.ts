import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KoOonTreeZManager } from '../../src/games/kooontreez/KoOonTreeZManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 35 })
    },
    KoOonTreezLogic: {
      ...actual.KoOonTreezLogic,
      fetchCountries: vi.fn().mockResolvedValue(true), // 🌟 S'assure de retourner une Promesse résolue
      getAllCountries: vi.fn().mockReturnValue([
        { id: 'fr', name: 'France' },
        { id: 'jp', name: 'Japan' }
      ])
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('KoOonTreeZManager - Test des Drapeaux & Séquestre', () => {
  let manager: KoOonTreeZManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn(),
      sockets: {
        sockets: new Map()
      }
    } as unknown as Server;

    manager = new KoOonTreeZManager(mockIo);
  });

  it('🟢 doit créer un salon KoOonTreeZ avec options de paris et de séquestre', () => {
    const creatorPlayer = {
      id: 'player_1',
      socketId: 'socket_1',
      username: 'FlagMaster',
      score: 0,
      roomId: 'room_kt_1',
      status: 'connected' as const,
      isReady: true
    };

    const options = {
      kooonTreezNbPlayer: 'duo' as const,
      kooonTreezMode: 'DvsP' as const,
      kooonTreezOption: 'Blitzkrieg' as const,
      wagerAmount: 30,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'room_kt_1',
      'Front des Drapeaux',
      creatorPlayer,
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('room_kt_1');
    expect(room.wagerAmount).toBe(30);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un joueur de rejoindre le front', () => {
    const creatorPlayer = {
      id: 'p1',
      socketId: 'socket_p1',
      username: 'Soldat1',
      score: 0,
      roomId: 'room_kt_2',
      status: 'connected' as const,
      isReady: true
    };

    manager.createRoom('room_kt_2', 'Bataille Alpine', creatorPlayer, {
      kooonTreezNbPlayer: 'duo' as const
    });

    const room = manager.handlePlayerJoin('room_kt_2', 'Soldat2', 'socket_s2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.players[1].username).toBe('Soldat2');
  });
});