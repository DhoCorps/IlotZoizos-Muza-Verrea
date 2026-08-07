import { PlayerGameStats, QuizTrophy } from '@ilot/types';

export interface ScoreCalculationResult {
  pointsEarned: number;
  newScore: number;
  newStreak: number;
  multiplier: number;
  iconReward: string; // Ex: '🪶', '🌱', '⚡'
}

export class QuizScoringEngine {
  /**
   * Calcule les points d'une réponse correcte avec coefficient de série et rapidité
   */
  public static calculateScore(
    currentScore: number,
    currentStreak: number,
    responseTimeMs: number,
    maxTimeMs: number = 15000
  ): ScoreCalculationResult {
    const basePoints = 1000;
    const newStreak = currentStreak + 1;
    
    // Multiplicateur de série (ex: streak 1 = 1x, streak 3 = 1.6x, plafonné à 3x)
    const streakMultiplier = Math.min(1 + (newStreak - 1) * 0.3, 3.0);
    
    // Bonus de rapidité
    const timeRatio = Math.max(0, 1 - (responseTimeMs / maxTimeMs));
    const speedBonus = Math.round(500 * timeRatio);

    const pointsEarned = Math.round((basePoints * streakMultiplier) + speedBonus);
    const newScore = currentScore + pointsEarned;

    // Choix de l'icône de récompense positive selon la série
    let iconReward = '🪶';
    if (newStreak >= 3) iconReward = '🌱';
    if (newStreak >= 5) iconReward = '🔥';
    if (newStreak >= 10) iconReward = '⚡';

    return {
      pointsEarned,
      newScore,
      newStreak,
      multiplier: Number(streakMultiplier.toFixed(1)),
      iconReward
    };
  }

  /**
   * Réinitialise la série en cas de mauvaise réponse
   */
  public static handleIncorrectAnswer(currentScore: number): ScoreCalculationResult {
    return {
      pointsEarned: 0,
      newScore: currentScore,
      newStreak: 0,
      multiplier: 1.0,
      iconReward: '❌'
    };
  }

  /**
   * Analyse les stats de fin de partie et génère les trophées honorifiques
   */
  public static evaluateEndOfGameTrophies(player: PlayerGameStats): QuizTrophy[] {
    const trophies: QuizTrophy[] = [];
    const avgResponseTime = player.questionsAnswered > 0 
      ? player.totalResponseTime / player.questionsAnswered 
      : 0;

    if (avgResponseTime > 0 && avgResponseTime < 4000) {
      trophies.push({
        id: `trophy-lightning-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // 🪡 Ajout de l'ID unique requis par QuizTrophy
        type: 'LIGHTNING',
        title: 'L’Éclair du Ciel',
        description: 'Une vitesse de réflexion fulgurante !',
        icon: '⚡'
      });
    }

    if (player.maxStreak >= 5) {
      trophies.push({
        id: `trophy-phoenix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // 🪡 Idem
        type: 'PHOENIX',
        title: 'Le Phénix',
        description: `Une série impressionnante de ${player.maxStreak} bonnes réponses.`,
        icon: '🔥'
      });
    }

    if (player.questionsAnswered > 0 && player.correctAnswers === player.questionsAnswered) {
      trophies.push({
        id: `trophy-hawkeye-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // 🪡 Idem
        type: 'HAWK_EYE',
        title: 'L’Œil de Faucon',
        description: 'Zéro erreur du début à la fin.',
        icon: '🎯'
      });
    }

    return trophies;
  }
}