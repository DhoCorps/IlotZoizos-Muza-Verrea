// apps/hub-central/modules/games/quiz/QuizGameScreen.tsx
'use client';
import React, { useRef } from 'react';
import { useQuizGame } from './useQuizGame';
import { QuizQuestion, PlayerGameStats, QuizTrophy } from '@ilot/types';

interface QuizGameScreenProps {
  title: string;
  themeIcon: string;
  currentQuestion: QuizQuestion | null;
  onNextQuestion: () => void;
  mode?: 'standard' | 'race_to_score';
  targetScore?: number;
}

export function QuizGameScreen({
  title,
  themeIcon,
  currentQuestion,
  onNextQuestion,
  mode = 'standard',
  targetScore = 5000,
}: QuizGameScreenProps) {
  // Référence pour s'assurer de ne sauvegarder qu'une seule fois par fin de partie
  const hasSavedRef = useRef(false);

  const {
    score,
    streak,
    multiplier,
    timeLeft,
    feedbackEffect,
    isGameOver,
    earnedTrophies,
    handleAnswerSubmission,
  } = useQuizGame({
    mode,
    targetScore,
    onGameOver: async (stats: PlayerGameStats) => {
      if (hasSavedRef.current) return;
      hasSavedRef.current = true;

      try {
        const gameTypeDetected = title.toLowerCase().includes('kooontreez') ? 'KoOonTreeZ' : 'WikiOracle';
        
        await fetch('/api/games/save-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: gameTypeDetected,
            score: stats.finalScore,
            trophies: earnedTrophies.map((t: QuizTrophy) => t.id || t.title),
            maxStreak: stats.maxStreak,
          }),
        });
        console.log('🏆 [Arène] Résultat de la partie sauvegardé avec succès !');
      } catch (err) {
        console.error('❌ [Arène] Échec lors de la persistance du résultat :', err);
      }
    },
  });

  if (isGameOver) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/30 text-center animate-fade-in">
        <h2 className="text-3xl font-extrabold mb-4">🎉 Victoire dans l’Arène !</h2>
        <p className="text-xl text-slate-300 mb-6">Score final : <strong className="text-emerald-400">{score} pts</strong></p>
        
        <div className="mb-8">
          <h3 className="text-lg font-bold text-amber-400 mb-3">Trophées de Vol Décrochés :</h3>
          {earnedTrophies.length === 0 ? (
            <p className="text-slate-400 italic">Aucun trophée majeur sur cette session. Retente ta chance !</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {earnedTrophies.map((trophy: QuizTrophy, idx: number) => (
                <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                    <span className="text-3xl mb-2">{trophy.icon}</span>
                    <h4 className="font-bold text-white text-sm">{trophy.title}</h4>
                    <p className="text-xs text-slate-400 text-center mt-1">{trophy.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          S'envoler pour une nouvelle partie 🦅
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="text-center p-8 text-white">Chargement de la sève... 🌱</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 relative overflow-hidden">
      
      {/* 🚀 En-tête : Score, Série et Multiplicateur Kahoot */}
      <div className="flex justify-between items-center mb-6 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{themeIcon}</span>
          <span className="font-bold text-lg">{title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Score</div>
            <div className="text-xl font-black text-emerald-400">{score}</div>
          </div>
          <div className="bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/40 text-amber-300 font-bold text-sm">
            🔥 x{multiplier} <span className="text-xs font-normal">({streak} streak)</span>
          </div>
        </div>
      </div>

      {/* ⏱️ Barre de Timer */}
      <div className="w-full bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-1000"
          style={{ width: `${(timeLeft / 15) * 100}%` }}
        />
      </div>

      {/* ✨ Effet de Feedback Volant (Positif / Négatif) */}
      {feedbackEffect && (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-extrabold shadow-2xl transition-all animate-bounce ${
          feedbackEffect.isPositive ? 'bg-emerald-600 border border-emerald-400' : 'bg-rose-600 border border-rose-400 animate-shake'
        }`}>
          <span className="text-3xl">{feedbackEffect.icon}</span>
          <span className="text-lg">{feedbackEffect.text}</span>
        </div>
      )}

      {/* ❓ Question / Prompt */}
      <div className="mb-6 text-center">
        <h3 className="text-xl font-semibold mb-4">{currentQuestion.prompt}</h3>
        {/* Si c'est une image (ex: drapeau KoOonTreez) */}
        {currentQuestion.metadata?.entityRef && currentQuestion.metadata.entityRef.startsWith('http') && (
          <div className="flex justify-center mb-4">
            <img src={currentQuestion.metadata.entityRef} alt="Ressource visuelle" className="h-32 rounded-lg shadow-md border border-slate-700" />
          </div>
        )}
      </div>

      {/* 🔠 Options de réponse */}
      <div className="grid grid-cols-1 gap-3">
        {currentQuestion.options.map((option, idx) => {
          const isCorrect = option === currentQuestion.options[currentQuestion.correctAnswerIndex];
          return (
            <button
              key={idx}
              onClick={() => {
                handleAnswerSubmission(isCorrect);
                onNextQuestion();
              }}
              className="w-full p-4 bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 rounded-xl text-left font-medium transition-all shadow-sm flex justify-between items-center group"
            >
              <span>{option}</span>
              <span className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity">👉</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}