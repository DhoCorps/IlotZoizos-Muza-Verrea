import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlumZeeManager } from '../../src/games/plumzee/PlumZeeManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 45 })
    },
    PlumZeeLogic: {
      ...actual.PlumZeeLogic,
      rollInitialDice: vi.fn().mockReturnValue([
        { id: 1, value: 1, isLocked: false },
        { id: 2, value: 2, isLocked: false },
        { id: 3, value: 3, isLocked: false },
        { id: 4, value: 4, isLocked: false },
        { id: 5, value: 5, isLocked: false }
      ])
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('PlumZeeManager - Test du Boulier & Séquestre', () => {
  let manager: PlumZeeManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new PlumZeeManager(mockIo);
  });

  it('🟢 doit créer un salon PlumZee avec options de paris et de séquestre', () => {
    const options = {
      maxRounds: 13,
      turnTimeLimitSec: 60, // 🌟 Ajouté pour satisfaire PlumZeeGameOptions
      wagerAmount: 20,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'room_plum_1',
      'Boulier Cosmique',
      'player_1',
      'PlumMaster',
      'socket_p1',
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('room_plum_1');
    expect(room.wagerAmount).toBe(20);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un joueur de rejoindre le salon PlumZee', () => {
    const options = { 
      maxRounds: 13, 
      turnTimeLimitSec: 60 // 🌟 Ajouté ici aussi
    };
    
    manager.createRoom('room_plum_2', 'Boulier Solo', 'p1', 'PlayerOne', 'sock1', options);
    const room = manager.handlePlayerJoin('room_plum_2', 'PlayerTwo', 'sock2');

    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.state).toBe('playing');
  });
});