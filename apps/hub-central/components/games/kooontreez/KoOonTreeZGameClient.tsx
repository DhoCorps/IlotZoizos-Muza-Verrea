// apps/hub-central/components/games/kooontreez/KoOonTreezGameClient.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { KoOonTreezLogic } from '@ilot/shared-core';
import { FullCountryData, KoOonTreezLevel, KoOonTreezMode, CurrentFlag, KoOonTreezQuizQuestion } from '@ilot/shared-core'; // Ajuste l'import des types selon ton arborescence
import { QuizScoringEngine } from '@ilot/shared-core';
import { PlayerGameStats, QuizTrophy } from '@ilot/types';

interface KoOonTreezGameClientProps {
  username: string;
  isLearningMode?: boolean; // Permet d'activer ou non le mode apprentissage
}

export default function KoOonTreezGameClient({ username, isLearningMode = true }: KoOonTreezGameClientProps) {
  const [countries, setCountries] = useState<FullCountryData[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<KoOonTreezQuizQuestion | null>(null);
  const [currentCountryData, setCurrentCountryData] = useState<FullCountryData | null>(null);
  
  // États du jeu
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [feedback, setFeedback] = useState<{ icon: string; text: string; isPositive: boolean } | null>(null);
  
  // États du Mode Apprentissage (Fiche pays détaillée)
  const [showLearningModal, setShowLearningModal] = useState<boolean>(false);

  // Stats de fin
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [questionsCount, setQuestionsCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Initialisation des pays
  useEffect(() => {
    async function init() {
      await KoOonTreezLogic.fetchCountries();
      const all = KoOonTreezLogic.getAllCountries();
      setCountries(all);
      loadNextQuestion(all);
    }
    init();
  }, []);

  const loadNextQuestion = (allCountries: FullCountryData[]) => {
    if (allCountries.length === 0) return;

    // On tire une question au hasard (niveau 'average', mode 'DvsP' par exemple)
    const level: KoOonTreezLevel = 'average';
    const mode: KoOonTreezMode = 'DvsP';
    const usedIds = KoOonTreezLogic.getUsedCountryIds();

    const q = KoOonTreezLogic.getQuizQuestion(level, mode, allCountries, usedIds);
    if (!q) {
      setIsGameOver(true);
      return;
    }

    setCurrentQuestion(q);
    
    // Récupérer les données brutes complètes du pays pour le mode apprentissage
    if (q.currentFlag) {
      const full = allCountries.find(c => c.cca2 === q.currentFlag?.id);
      setCurrentCountryData(full || null);
    }
  };

  const handleAnswer = (selectedOption: string) => {
    if (!currentQuestion || isGameOver) return;

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const newQCount = questionsCount + 1;
    setQuestionsCount(newQCount);

    if (isCorrect) {
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);

      // Calcul des points Kahoot-style
      const res = QuizScoringEngine.calculateScore(score, streak, 3000);
      setScore(res.newScore);
      setStreak(res.newStreak);
      setMultiplier(res.multiplier);

      setFeedback({ icon: res.iconReward, text: `+${res.pointsEarned} pts`, isPositive: true });
    } else {
      const res = QuizScoringEngine.handleIncorrectAnswer(score);
      setStreak(res.newStreak);
      setMultiplier(res.multiplier);
      setFeedback({ icon: '❌', text: 'Oups !', isPositive: false });
    }

    // Si le Mode Apprentissage est activé, on ouvre la fiche d'information avant de passer à la suite
    if (isLearningMode) {
      setShowLearningModal(true);
    } else {
      setTimeout(() => {
        setFeedback(null);
        loadNextQuestion(countries);
      }, 1000);
    }
  };

  const closeLearningModalAndProceed = () => {
    setShowLearningModal(false);
    setFeedback(null);
    if (questionsCount >= 10) {
      setIsGameOver(true);
    } else {
      loadNextQuestion(countries);
    }
  };

  if (isGameOver) {
    return (
      <div className="max-w-md mx-auto p-8 bg-slate-900 text-white rounded-2xl shadow-xl border border-emerald-500/30 text-center">
        <h2 className="text-2xl font-bold mb-4">🌳 Fin de la session KoOonTreez</h2>
        <p className="text-lg text-slate-300 mb-6">Score final : <strong className="text-emerald-400">{score} pts</strong></p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-emerald-600 rounded-xl font-bold text-white">
          Replanter une graine 🌿
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="text-center py-20 text-white animate-pulse">Chargement des racines du monde... 🌱</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 relative">
      
      {/* 🚀 En-tête Score & Multiplicateur */}
      <div className="flex justify-between items-center mb-6 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
        <div>
          <span className="text-xl">🌳 KoOonTreez</span>
          <div className="text-xs text-slate-400"> Explorateur : {username}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-emerald-400">{score} pts</div>
          <div className="text-xs text-amber-400 font-bold">🔥 x{multiplier} ({streak} streak)</div>
        </div>
      </div>

      {/* 🎨 Zone de Question (Affichage du Drapeau) */}
      <div className="mb-6 text-center">
        <p className="text-sm text-slate-400 mb-3">Quel est ce pays d'après son drapeau ?</p>
        <div className="flex justify-center mb-4">
          <img 
            src={currentQuestion.question} 
            alt="Drapeau à deviner" 
            className="h-36 rounded-xl shadow-lg border border-slate-700 object-contain bg-slate-950" 
          />
        </div>
      </div>

      {/* ✨ Feedback visuel instantané */}
      {feedback && !showLearningModal && (
        <div className={`text-center py-2 mb-4 rounded-xl font-bold flex justify-center items-center gap-2 ${
          feedback.isPositive ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
        }`}>
          <span className="text-xl">{feedback.icon}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 🔠 Options de réponse */}
      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.options.map((option, idx) => (
          <button
            key={idx}
            disabled={showLearningModal}
            onClick={() => handleAnswer(option)}
            className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium transition-all text-center shadow-sm"
          >
            {option}
          </button>
        ))}
      </div>

      {/* 📖 MODALE DU MODE APPRENTISSAGE (Fiche Pays Détaillée) */}
      {showLearningModal && currentCountryData && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between z-50 animate-fade-in border border-emerald-500/40">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-xl font-extrabold text-emerald-400 flex items-center gap-2">
                <span>📖 Fiche Apprentissage</span>
              </h3>
              <button 
                onClick={closeLearningModalAndProceed}
                className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg text-sm"
              >
                Fermer ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <img src={currentCountryData.flags.png || currentCountryData.flags.svg} alt="Drapeau" className="w-16 h-10 object-cover rounded shadow" />
                <div>
                  <h4 className="text-lg font-bold text-white">{currentCountryData.name.common}</h4>
                  <p className="text-xs text-slate-400">{currentCountryData.name.official}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Capitale</span>
                  <strong className="text-white">{currentCountryData.capital?.[0] || 'N/A'}</strong>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Région / Continent</span>
                  <strong className="text-white">{currentCountryData.region} ({currentCountryData.continents?.[0]})</strong>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Population</span>
                  <strong className="text-white">{currentCountryData.population?.toLocaleString('fr-FR')} hab.</strong>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Monnaie</span>
                    <strong className="text-white">
                        {currentCountryData.currencies 
                        ? (Object.values(currentCountryData.currencies)[0] as { name?: string })?.name || 'N/A'
                        : 'N/A'
                        }
                    </strong>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={closeLearningModalAndProceed}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg mt-4"
          >
            Question Suivante 🦅 👉
          </button>
        </div>
      )}

    </div>
  );
}