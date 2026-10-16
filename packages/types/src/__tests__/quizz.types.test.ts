// Fichier : packages/types/src/__tests__/quiz.types.test.ts
import { describe, it, expect } from 'vitest';
import { 
  QuizQuestionSchema, 
  PlayerGameStatsSchema, 
  GameSessionConfigSchema, 
  GameEventPayloadSchema,
  GameResultResponseSchema
} from '../models/quizz.types';

describe('Matérialisation des Fantômes : Quiz Types & Schemas', () => {

  it('🟢 doit valider une question de quiz bien formatée', () => {
    const validQuestion = {
      id: 'q_123',
      prompt: 'Quel est le nom du vaisseau dans Alien ?',
      options: ['Nostromo', 'Sulaco', 'Auriga', 'Prometheus'],
      correctAnswerIndex: 0,
      difficulty: 'medium',
      metadata: {
        category: 'Sci-Fi'
      }
    };

    const result = QuizQuestionSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter une question avec moins de deux options', () => {
    const invalidQuestion = {
      id: 'q_456',
      prompt: 'Vrai ou faux ?',
      options: ['Vrai'], // 🚨 Il faut au moins 2 options
      correctAnswerIndex: 0
    };

    const result = QuizQuestionSchema.safeParse(invalidQuestion);
    expect(result.success).toBe(false);
  });

  it('🟢 doit coercer une date ISO en objet Date pour PlayerGameStatsSchema', () => {
    const isoDate = "2026-10-16T14:30:00.000Z";
    const validStats = {
      playerId: 'bird_1',
      playerName: 'Oiseau Bleu',
      score: 1500,
      finalScore: 1500,
      currentStreak: 3,
      maxStreak: 5,
      totalResponseTime: 45000,
      questionsAnswered: 10,
      correctAnswers: 8,
      finishedAt: isoDate // ⏳ String ISO
    };

    const result = PlayerGameStatsSchema.safeParse(validStats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finishedAt).toBeInstanceOf(Date); // ⏳ Vérification coerce
      expect(result.data.finishedAt?.toISOString()).toBe(isoDate);
      expect(result.data.trophies).toEqual([]); // Vérification de la valeur par défaut
    }
  });

  it('🟢 doit valider une configuration de session de jeu', () => {
    const config = {
      theme: 'cine',
      mode: 'race_to_score',
      targetScore: 5000,
      timePerQuestion: 15,
      isMultiplayer: true
    };

    const result = GameSessionConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter un payload d\'événement avec un temps de réponse négatif', () => {
    const payload = {
      sessionId: 'sess_1',
      playerId: 'bird_1',
      questionId: 'q_123',
      selectedOptionIndex: 2,
      responseTimeMs: -500 // 🚨 Interdit
    };

    const result = GameEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('🟢 doit valider un résultat de jeu avec succès', () => {
    const resultResponse = {
      success: true,
      isCorrect: true,
      pointsEarned: 150,
      newScore: 1650,
      multiplier: 1.5,
      streak: 4,
      targetReached: false
    };

    const result = GameResultResponseSchema.safeParse(resultResponse);
    expect(result.success).toBe(true);
  });
});