import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtomikKFardEManager } from '../../src/games/atomik-k-far/Atomik-K-FarManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 30 })
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('AtomikKFardEManager - Test du Gestionnaire & Séquestre', () => {
  let manager: AtomikKFardEManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new AtomikKFardEManager(mockIo);
  });

  it('🟢 doit créer une salle avec les options de paris et de séquestre typées', () => {
    const options = {
      nbPlayer: 'duo' as const,
      mode: 'Stratege' as const,
      option: 'Sonic' as const,
      teamMode: 'Random' as const,
      gameStyle: 'Conquête' as const,
      timePerRound: 30 as const,
      maxRounds: 5,
      scoreToWin: 10,
      wagerAmount: 20,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Maestro'
    };

    const room = manager.createRoom(
      'room_atomik_1',
      'Salon Atomique',
      'bird_owner',
      'OwnerBird',
      'socket_1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('room_atomik_1');
    expect(room.wagerAmount).toBe(20);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un deuxième joueur de rejoindre et lancer la partie', () => {
    const options = {
      nbPlayer: 'duo' as const,
      mode: 'Stratege' as const,
      option: 'Sonic' as const,
      teamMode: 'Random' as const,
      gameStyle: 'Conquête' as const,
      timePerRound: 30 as const,
      maxRounds: 5,
      scoreToWin: 10
    };

    manager.createRoom('room_atomik_2', 'Salon Duo', 'p1', 'PlayerOne', 'sock_1', options);
    const room = manager.handlePlayerJoin('room_atomik_2', 'PlayerTwo', 'sock_2');

    expect(room.players.length).toBe(2);
    expect(room.players[1].username).toBe('PlayerTwo');
  });
});