// Fichier : packages/types/src/core/quiz.types.ts
import { z } from 'zod';

export const QuizThemeSchema = z.enum(['cine', 'kooontreez', 'wikioracle']);
export type QuizTheme = z.infer<typeof QuizThemeSchema>;

export const QuizGameModeSchema = z.enum(['standard', 'race_to_score', 'survival']);
export type QuizGameMode = z.infer<typeof QuizGameModeSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string().min(1, "L'ID de la question est requis"),
  prompt: z.string().min(1, "L'intitulé de la question est requis"),
  options: z.array(z.string()).min(2, "Il faut au moins 2 options"),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  metadata: z.object({
    entityRef: z.string().optional(), // Lien vers Neo4j ou MongoDB si pertinent
    category: z.string().optional(),
  }).optional(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const TrophyTypeSchema = z.enum([
  'LIGHTNING',   // Meilleure moyenne de temps de réponse
  'PHOENIX',     // Plus longue série de réponses justes
  'HAWK_EYE',    // Précision pure (zéro erreur)
  'COMEBACK',    // Remontée fulgurante
  'REGULARITY'   // Constance chronométrique
]);
export type TrophyType = z.infer<typeof TrophyTypeSchema>;

export const QuizTrophySchema = z.object({
  id: z.string().min(1),
  type: TrophyTypeSchema,
  title: z.string().min(1),
  description: z.string(),
  icon: z.string(), // Nom de l'icône ou emoji
});
export type QuizTrophy = z.infer<typeof QuizTrophySchema>;

export const PlayerGameStatsSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  score: z.number().default(0),
  finalScore: z.number().default(0),
  currentStreak: z.number().int().min(0).default(0),
  maxStreak: z.number().int().min(0).default(0),
  totalResponseTime: z.number().min(0).default(0), // en millisecondes
  questionsAnswered: z.number().int().min(0).default(0),
  correctAnswers: z.number().int().min(0).default(0),
  trophies: z.array(QuizTrophySchema).default([]),
  finishedAt: z.coerce.date().optional(), // ⏳ Harmonisation (z.coerce.date)
});
export type PlayerGameStats = z.infer<typeof PlayerGameStatsSchema>;

export const GameSessionConfigSchema = z.object({
  theme: QuizThemeSchema,
  mode: QuizGameModeSchema,
  targetScore: z.number().positive().optional(),      // Utilisé pour le mode 'race_to_score' (ex: 5000 points)
  maxQuestions: z.number().int().positive().optional(), // Utilisé pour le mode 'standard'
  timePerQuestion: z.number().int().positive(),   // En secondes (ex: 15s)
  isMultiplayer: z.boolean().default(false),
});
export type GameSessionConfig = z.infer<typeof GameSessionConfigSchema>;

export const GameEventPayloadSchema = z.object({
  sessionId: z.string().min(1),
  playerId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptionIndex: z.number().int().min(0),
  responseTimeMs: z.number().int().min(0),
});
export type GameEventPayload = z.infer<typeof GameEventPayloadSchema>;

export const GameResultResponseSchema = z.object({
  success: z.boolean(),
  isCorrect: z.boolean(),
  pointsEarned: z.number(),
  newScore: z.number(),
  multiplier: z.number().min(1).default(1),
  streak: z.number().int().min(0).default(0),
  targetReached: z.boolean().default(false), // True si le joueur a franchi le seuil de score en mode course
});
export type GameResultResponse = z.infer<typeof GameResultResponseSchema>;