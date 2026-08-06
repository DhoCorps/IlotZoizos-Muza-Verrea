// packages/types/src/quiz.types.ts

export type QuizTheme = 'cine' | 'kooontreez' | 'wikioracle';

export type GameMode = 'standard' | 'race_to_score' | 'survival';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  metadata?: {
    entityRef?: string; // Lien vers Neo4j ou MongoDB si pertinent
    category?: string;
  };
}

export type TrophyType = 
  | 'LIGHTNING'   // Meilleure moyenne de temps de réponse
  | 'PHOENIX'     // Plus longue série de réponses justes
  | 'HAWK_EYE'    // Précision pure (zéro erreur)
  | 'COMEBACK'    // Remontée fulgurante
  | 'REGULARITY'; // Constance chronométrique

export interface QuizTrophy {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  icon: string; // Nom de l'icône ou emoji
}

export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  score: number;
  finalScore: number;
  currentStreak: number;
  maxStreak: number;
  totalResponseTime: number; // en millisecondes
  questionsAnswered: number;
  correctAnswers: number;
  trophies: QuizTrophy[];
  finishedAt?: Date;
}

export interface GameSessionConfig {
  theme: QuizTheme;
  mode: GameMode;
  targetScore?: number;      // Utilisé pour le mode 'race_to_score' (ex: 5000 points)
  maxQuestions?: number;     // Utilisé pour le mode 'standard'
  timePerQuestion: number;   // En secondes (ex: 15s)
  isMultiplayer: boolean;
}

export interface GameEventPayload {
  sessionId: string;
  playerId: string;
  questionId: string;
  selectedOptionIndex: number;
  responseTimeMs: number;
}

export interface GameResultResponse {
  success: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  newScore: number;
  multiplier: number;
  streak: number;
  targetReached: boolean; // True si le joueur a franchi le seuil de score en mode course
}