import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { PraiseModel } from '../../nosql/praise.model'; // Ajuste le chemin relatif
import { connectToDatabase } from '../../../mongoose'; // Ajuste selon ton chemin

describe('Praise Model Test', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should create & save a praise correctly', async () => {
    const authorId = new mongoose.Types.ObjectId();
    const recipientId = new mongoose.Types.ObjectId();

    const praiseData = {
      author: authorId,
      recipient: recipientId,
      text: 'Merci pour ta lumière et ton aide précieuse sur l’architecture du code.',
      type: 'civic'
    };

    const praise = new PraiseModel(praiseData);
    const savedPraise = await praise.save();

    expect(savedPraise._id).toBeDefined();
    expect(savedPraise.text).toBe(praiseData.text);
    expect(savedPraise.type).toBe('civic');
    expect(savedPraise.createdAt).toBeDefined();
  });
});