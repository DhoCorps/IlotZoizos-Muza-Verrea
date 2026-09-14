import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikiOracleManager } from '../../src/games/wikioracle/WikiOracleManager';
import { BettingOrchestrator } from '@ilot/shared-core';
import { Server } from 'socket.io';

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    BettingOrchestrator: {
      resolveGameAndCalculateCredit: vi.fn().mockResolvedValue({ creditEarned: 60 })
    },
    WikiOracleLogic: {
      ...actual.WikiOracleLogic,
      getQuizQuestion: vi.fn().mockResolvedValue({
        questionTitle: 'Albert Einstein',
        correctAnswer: 'Einstein',
        options: ['Newton', 'Einstein', 'Darwin', 'Tesla'],
        hints: ['Physicien', 'Relativité'],
        imageUrl: 'http://example.com/einstein.jpg'
      })
    }
  };
});

vi.mock('@ilot/infrastructure', () => ({
  GameStatsService: {
    recordMatch: vi.fn().mockResolvedValue(true)
  }
}));

describe('WikiOracleManager - Test de l’Oracle & Séquestre', () => {
  let manager: WikiOracleManager;
  let mockIo: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      emit: vi.fn()
    } as unknown as Server;

    manager = new WikiOracleManager(mockIo);
  });

  it('🟢 doit créer un salon WikiOracle avec options de paris et de séquestre', () => {
    const creatorPlayer = {
      id: 'oracle_1',
      socketId: 'sock_o1',
      username: 'SavantWiki',
      score: 0,
      roomId: 'room_wiki_1',
      status: 'connected' as const,
      isReady: true,
      currentHintLevel: 0 // 🌟 Ajouté pour respecter WikiOraclePlayer
    };

    const options = {
      choicesMode: '4' as const,
      theme: 'random' as const,
      wagerAmount: 50,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER'
    };

    const room = manager.createRoom(
      'room_wiki_1',
      'Sanctuaire du Savoir',
      creatorPlayer,
      options
    );

    expect(room).toBeDefined();
    expect(room.id).toBe('room_wiki_1');
    expect(room.wagerAmount).toBe(50);
    expect(room.wagerCurrency).toBe('DHO');
    expect(room.players.length).toBe(1);
  });

  it('🟢 doit permettre à un chercheur de rejoindre le sanctuaire', () => {
    const creatorPlayer = {
      id: 'p1',
      socketId: 'sock_p1',
      username: 'Chercheur1',
      score: 0,
      roomId: 'room_wiki_2',
      status: 'connected' as const,
      isReady: true,
      currentHintLevel: 0 // 🌟 Ajouté ici aussi
    };

    manager.createRoom('room_wiki_2', 'Bibliothèque', creatorPlayer, { choicesMode: '4' });
    manager.handlePlayerJoin('room_wiki_2', 'Chercheur2', 'sock_p2');

    const room = manager.getRoom('room_wiki_2');
    expect(room).toBeDefined();
    expect(room?.players.length).toBe(2);
    expect(room?.players[1].username).toBe('Chercheur2');
  });
});