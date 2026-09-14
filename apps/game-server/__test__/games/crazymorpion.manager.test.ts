import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrazyMorpionManager } from '../../src/games/crazymorpion/CrazyMorpionManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 10 })
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('CrazyMorpionManager - Test du Manager & Séquestre', () => {
  let manager: CrazyMorpionManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new CrazyMorpionManager(mockIo);
  });

  it('🟢 doit créer un salon CrazyMorpion avec options de paris', () => {
    const options = {
      wagerAmount: 5,
      wagerCurrency: 'plumes',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'cm_room_1',
      'Morpion Express',
      'player1',
      'CrazyBird',
      'socket1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('cm_room_1');
    expect(room.wagerAmount).toBe(5);
    expect(room.wagerCurrency).toBe('plumes');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un adversaire de rejoindre et assigner les symboles', () => {
    const options = { wagerAmount: 10, wagerCurrency: 'DHO' };
    
    manager.createRoom('cm_room_2', 'Battle DHO', 'p1', 'Player1', 'sock1', options);
    const room = manager.handlePlayerJoin('cm_room_2', 'Player2', 'sock2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.state).toBe('playing');
    
    // Vérifier que les symboles ont été assignés (Plus et Minus)
    const symbols = room?.players.map(p => p.symbol);
    expect(symbols).toContain('+');
    expect(symbols).toContain('-');
  });
});