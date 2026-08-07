// apps/hub-central/modules/games/quiz/useQuizGame.ts
import { useState, useEffect, useCallback } from 'react';
import { QuizScoringEngine } from '@ilot/shared-core';
import { PlayerGameStats, QuizTrophy } from '@ilot/types';

interface UseQuizGameProps {
  mode: 'standard' | 'race_to_score';
  targetScore?: number;
  timePerQuestion?: number; // en secondes
  onGameOver?: (stats: PlayerGameStats) => void;
}

export function useQuizGame({
  mode = 'standard',
  targetScore = 5000,
  timePerQuestion = 15,
  onGameOver,
}: UseQuizGameProps) {
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  
  // États pour les animations de feedback (icône volante/positive/négative)
  const [feedbackEffect, setFeedbackEffect] = useState<{
    visible: boolean;
    icon: string;
    text: string;
    isPositive: boolean;
  } | null>(null);

  // Chronomètre de la question en cours
  const [timeLeft, setTimeLeft] = useState<number>(timePerQuestion);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [totalResponseTime, setTotalResponseTime] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [earnedTrophies, setEarnedTrophies] = useState<QuizTrophy[]>([]);

  // Gestion du timer de question
  useEffect(() => {
    if (isGameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Temps écoulé -> Considéré comme une mauvaise réponse
          handleAnswerSubmission(false, 0);
          return timePerQuestion;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameOver, questionStartTime]);

  // Réinitialiser le chrono pour une nouvelle question
  const startNewQuestion = useCallback(() => {
    setTimeLeft(timePerQuestion);
    setQuestionStartTime(Date.now());
  }, [timePerQuestion]);

  // Soumission d'une réponse
  const handleAnswerSubmission = (isCorrect: boolean, responseTimeMs?: number) => {
    if (isGameOver) return;

    const actualResponseTime = responseTimeMs || (Date.now() - questionStartTime);
    const maxTimeMs = timePerQuestion * 1000;

    const newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);
    setTotalResponseTime((prev) => prev + actualResponseTime);

    let currentScore = score;
    let currentStreak = streak;

    if (isCorrect) {
      const newCorrect = correctAnswers + 1;
      setCorrectAnswers(newCorrect);

      const result = QuizScoringEngine.calculateScore(score, streak, actualResponseTime, maxTimeMs);
      currentScore = result.newScore;
      currentStreak = result.newStreak;

      setScore(currentScore);
      setStreak(currentStreak);
      setMaxStreak((prev) => Math.max(prev, currentStreak));
      setMultiplier(result.multiplier);

      // Feedback Positif avec icône dynamique
      setFeedbackEffect({
        visible: true,
        icon: result.iconReward,
        text: `+${result.pointsEarned} pts (x${result.multiplier})`,
        isPositive: true,
      });

      // Vérification du mode "Course au score" (Race to Score)
      if (mode === 'race_to_score' && currentScore >= targetScore) {
        triggerGameOver({
          playerId: 'player-local',
          playerName: 'Oiseau Courageux',
          score: currentScore,
          finalScore: currentScore,
          currentStreak,
          maxStreak: Math.max(maxStreak, currentStreak),
          totalResponseTime: totalResponseTime + actualResponseTime,
          questionsAnswered: newQuestionsAnswered,
          correctAnswers: newCorrect,
          trophies: [],
        });
        return;
      }
    } else {
      const result = QuizScoringEngine.handleIncorrectAnswer(score);
      setStreak(result.newStreak);
      setMultiplier(result.multiplier);

      // Feedback Négatif
      setFeedbackEffect({
        visible: true,
        icon: '❌',
        text: 'Oups ! Série brisée',
        isPositive: false,
      });
    }

    // Masquer l'effet visuel après 1.5 seconde
    setTimeout(() => {
      setFeedbackEffect(null);
    }, 1500);

    startNewQuestion();
  };

  const triggerGameOver = (finalStats: PlayerGameStats) => {
    setIsGameOver(true);
    const trophies = QuizScoringEngine.evaluateEndOfGameTrophies(finalStats);
    finalStats.trophies = trophies;
    setEarnedTrophies(trophies);
    if (onGameOver) onGameOver(finalStats);
  };

  return {
    score,
    streak,
    multiplier,
    timeLeft,
    feedbackEffect,
    isGameOver,
    earnedTrophies,
    handleAnswerSubmission,
    startNewQuestion,
  };
}