// apps/hub-central/components/games/wikioracle/WikiOracleGameClient.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { WikiOracleLogic } from '@ilot/shared-core';
import { QuizGameScreen } from '../../../modules/games/quiz/QuizGameScreen';
import { QuizQuestion as SharedQuizQuestion } from '@ilot/types';

export default function WikiOracleGameClient({ username }: { username: string }) {
  const [currentQuestion, setCurrentQuestion] = useState<SharedQuizQuestion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNextQuestion = async () => {
    setIsLoading(true);
    try {
      // On appelle ta logique dynamique existante (ex: thème 'random', 4 choix)
      const rawQuestion = await WikiOracleLogic.getQuizQuestion('random', '4');
      
      if (!rawQuestion) {
        setCurrentQuestion(null);
        setIsLoading(false);
        return;
      }

      // Adaptation du format WikiOracle vers le format standard QuizQuestion de notre arène
      const formatted: SharedQuizQuestion = {
        id: Math.random().toString(36).substring(7),
        prompt: rawQuestion.questionTitle || "Devinez l'article Wikipédia !",
        options: rawQuestion.options,
        correctAnswerIndex: rawQuestion.options.indexOf(rawQuestion.correctAnswer),
        explanation: rawQuestion.hints ? rawQuestion.hints.join(' | ') : undefined,
        metadata: {
          entityRef: rawQuestion.imageUrl || '',
        }
      };

      setCurrentQuestion(formatted);
    } catch (err) {
      console.error("[WikiOracle] Erreur de chargement de question :", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNextQuestion();
  }, []);

  if (isLoading && !currentQuestion) {
    return (
      <div className="text-center py-20 text-white">
        <p className="animate-pulse text-lg text-amber-300">📜 Interrogation de l'Oracle Wikipédia en cours...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-amber-300">🔮 WikiOracle</h1>
        <p className="text-slate-400 text-sm mt-1">Explorateur : <span className="text-white font-medium">{username}</span></p>
      </div>

      <QuizGameScreen
        title="Arène de l'Oracle"
        themeIcon="📜"
        currentQuestion={currentQuestion}
        onNextQuestion={loadNextQuestion}
        mode="race_to_score"
        targetScore={3000}
      />
    </div>
  );
}