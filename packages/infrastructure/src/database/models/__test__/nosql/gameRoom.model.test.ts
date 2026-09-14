import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameRoomModel } from '../../nosql/gameRoom.model';
import { connectToDatabase } from '../../../mongoose';

describe('GameRoom Model Test', () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  afterEach(async () => {
    await GameRoomModel.deleteMany({});
  });

  it('🟢 doit créer et persister un salon de jeu avec ses règles de mise', async () => {
    const roomData = {
      roomId: 'room_test_123',
      gameId: 'crazymorpion',
      mode: 'MULTIPLAYER' as const,
      wagerAmount: 50,
      wagerCurrency: 'DHO',
      creatorUid: 'bird_creator_alpha',
      status: 'WAITING' as const,
      participants: ['bird_creator_alpha'],
    };

    const savedRoom = await GameRoomModel.create(roomData);

    expect(savedRoom).toBeDefined();
    expect(savedRoom.roomId).toBe(roomData.roomId);
    expect(savedRoom.wagerAmount).toBe(50);
    expect(savedRoom.wagerCurrency).toBe('DHO');
    expect(savedRoom.participants).toContain('bird_creator_alpha');
  });

  it('🔴 doit rejeter la création si les champs requis manquent', async () => {
    let error: any;
    try {
      await GameRoomModel.create({
        gameId: 'crazymorpion',
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.roomId).toBeDefined();
    expect(error.errors.creatorUid).toBeDefined();
  });
});