import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CineMaxManager } from '../../src/games/cinemax/CineMaxManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 40 })
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('CineMaxManager - Test du Projecteur & Séquestre', () => {
  let manager: CineMaxManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new CineMaxManager(mockIo);
  });

  it('🟢 doit projeter un salon CineMax avec les options de paris et de séquestre', () => {
    const options = {
      nbPlayer: 'duo' as const,
      timePerRound: 60,
      scoreToWin: 100,
      difficultyRule: 'PLAYER_CHOICE' as const,
      maxRounds: 3,
      wagerAmount: 15,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Artisan'
    };

    const room = manager.createRoom(
      'room_cine_1',
      'Ciné Club',
      'director_1',
      'CineDirector',
      'socket_c1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('room_cine_1');
    expect(room.wagerAmount).toBe(15);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un spectateur de rejoindre la salle de cinéma', () => {
    const options = {
      nbPlayer: 'duo' as const,
      timePerRound: 60,
      scoreToWin: 100,
      difficultyRule: 'PLAYER_CHOICE' as const,
      maxRounds: 3
    };

    manager.createRoom('room_cine_2', 'Ciné Duo', 'dir_1', 'Director', 'sock_d1', options);
    const room = manager.handlePlayerJoin('room_cine_2', 'SpectatorTwo', 'sock_d2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.players[1].username).toBe('SpectatorTwo');
  });
});