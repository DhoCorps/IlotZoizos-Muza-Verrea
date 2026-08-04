'use client';

import React, { useState } from 'react';
import { AlertCircle, Lock, Play, Film, User, MessageSquare } from 'lucide-react';

// --- Mocks des types pour le composant (à importer de tes shared-core en prod) ---
type Difficulty = 2 | 4 | 8 | 'TEXT';
interface Question {
  id: string;
  type: 'ACTOR_FACE' | 'DIRECTOR_FACE' | 'QUOTE';
  difficulty: Difficulty;
  questionText: string;
  imageUrl?: string;
  options: string[];
}

interface CineMaxBoardProps {
  pelliculeBlur: number; // de 100 à 0
  posterUrl: string | null;
  errorCount: number;
  isBuzzerLocked: boolean;
  pendingDifficultyChoice: boolean;
  currentQuestion: Question | null;
  onSelectDifficulty: (diff: Difficulty) => void;
  onSolveQuestion: (answer: string) => void;
  onHitBuzzer: (movieTitle: string) => void;
}

export default function CineMaxBoard({
  pelliculeBlur,
  posterUrl,
  errorCount,
  isBuzzerLocked,
  pendingDifficultyChoice,
  currentQuestion,
  onSelectDifficulty,
  onSolveQuestion,
  onHitBuzzer
}: CineMaxBoardProps) {
  
  // État local pour gérer l'ouverture du champ de saisie du buzzer
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzerGuess, setBuzzerGuess] = useState('');
  const [textAnswer, setTextAnswer] = useState('');

  // Conversion du pourcentage de flou en pixels CSS (100% = 30px de flou)
  const blurPixels = (pelliculeBlur / 100) * 30;

  const handleBuzzerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (buzzerGuess.trim()) {
      onHitBuzzer(buzzerGuess.trim());
      setIsBuzzing(false);
      setBuzzerGuess('');
    }
  };

  const handleTextAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textAnswer.trim()) {
      onSolveQuestion(textAnswer.trim());
      setTextAnswer('');
    }
  };

  return (
    <div className="relative flex w-full h-[80vh] bg-[#0A0D14] text-slate-200 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* =========================================
          PARTIE GAUCHE : L'AFFICHE (La Projection)
          ========================================= */}
      <div className="w-1/2 h-full relative flex items-center justify-center bg-black/50 p-6 border-r border-slate-800">
        <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 z-10">
          <Film className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-mono tracking-widest text-emerald-400">
            OBSCURITÉ : {pelliculeBlur}%
          </span>
        </div>

        {posterUrl ? (
          <div className="relative w-full max-w-md aspect-[2/3] rounded-lg overflow-hidden border-2 border-slate-800 shadow-2xl">
            {/* L'image avec le filtre dynamique */}
            <img 
              src={posterUrl} 
              alt="Affiche Mystère" 
              className="w-full h-full object-cover transition-all duration-700 ease-out"
              style={{ filter: `blur(${blurPixels}px) brightness(${100 - (pelliculeBlur * 0.5)}%)` }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-600">
            <Play className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-mono">En attente de la pellicule...</p>
          </div>
        )}
      </div>

      {/* =========================================
          LE CENTRE : LE BUZZER (Tension maximale)
          ========================================= */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
        
        {/* Le Champ de saisie qui apparaît quand on buzze */}
        {isBuzzing && (
          <form 
            onSubmit={handleBuzzerSubmit} 
            className="absolute bottom-full mb-6 w-72 bg-slate-900 p-4 rounded-xl border border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.3)] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4"
          >
            <label className="text-center font-bold text-red-400 tracking-wider text-sm">TITRE DU FILM :</label>
            <input 
              autoFocus
              type="text" 
              value={buzzerGuess}
              onChange={(e) => setBuzzerGuess(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500 text-center font-bold"
              placeholder="Ex: Fight Club..."
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsBuzzing(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-semibold transition-colors">Annuler</button>
              <button type="submit" className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-bold text-white transition-colors">Valider</button>
            </div>
          </form>
        )}

        {/* Le Bouton Buzzer Physique */}
        <button
          onClick={() => !isBuzzerLocked && !isBuzzing && setIsBuzzing(true)}
          disabled={isBuzzerLocked}
          className={`
            relative flex flex-col items-center justify-center w-36 h-36 rounded-full border-8 font-black tracking-widest text-xl uppercase transition-all duration-200
            ${isBuzzerLocked 
              ? 'bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed' 
              : 'bg-red-600 border-red-800 text-white hover:bg-red-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_rgba(220,38,38,0.8)]'
            }
          `}
        >
          {isBuzzerLocked ? (
            <>
              <Lock className="w-8 h-8 mb-2" />
              <span>Verrouillé</span>
            </>
          ) : (
            <span>Buzzer</span>
          )}
        </button>

        {/* Jauge de pénalité sous le buzzer */}
        {errorCount > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-red-950/50 px-3 py-1.5 rounded-full border border-red-900">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-400">Erreurs : {errorCount}</span>
          </div>
        )}
      </div>

      {/* =========================================
          PARTIE DROITE : LES QUESTIONS (Le Travail)
          ========================================= */}
      <div className="w-1/2 h-full relative flex flex-col items-center justify-center p-8 bg-slate-900/50">
        
        {/* Écran 1 : Choix de la difficulté */}
        {pendingDifficultyChoice && !currentQuestion && (
          <div className="flex flex-col items-center w-full max-w-md animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-bold text-slate-100 mb-2 text-center">Choisis ton Risque</h3>
            <p className="text-slate-400 text-sm mb-8 text-center">Plus le risque est grand, plus l'affiche s'éclaircit pour l'équipe.</p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <button onClick={() => onSelectDifficulty(2)} className="flex flex-col items-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:-translate-y-1">
                <span className="text-lg font-bold text-emerald-400">Amateur</span>
                <span className="text-xs text-slate-400 mt-1">2 Choix (+2 pts)</span>
              </button>
              <button onClick={() => onSelectDifficulty(4)} className="flex flex-col items-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:-translate-y-1">
                <span className="text-lg font-bold text-blue-400">Habitué</span>
                <span className="text-xs text-slate-400 mt-1">4 Choix (+5 pts)</span>
              </button>
              <button onClick={() => onSelectDifficulty(8)} className="flex flex-col items-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:-translate-y-1">
                <span className="text-lg font-bold text-purple-400">Expert</span>
                <span className="text-xs text-slate-400 mt-1">8 Choix (+10 pts)</span>
              </button>
              <button onClick={() => onSelectDifficulty('TEXT')} className="flex flex-col items-center p-4 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 rounded-xl transition-all hover:-translate-y-1 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <span className="text-lg font-bold text-amber-400">Cinéphile</span>
                <span className="text-xs text-slate-400 mt-1">Saisie Libre (+20 pts)</span>
              </button>
            </div>
          </div>
        )}

        {/* Écran 2 : La Question en cours */}
        {currentQuestion && (
          <div className="flex flex-col items-center w-full max-w-md animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-3 mb-6 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
              {currentQuestion.type === 'QUOTE' ? <MessageSquare className="w-5 h-5 text-blue-400" /> : <User className="w-5 h-5 text-blue-400" />}
              <span className="font-semibold text-slate-200">{currentQuestion.questionText}</span>
            </div>

            {/* Photo de l'acteur si applicable */}
            {currentQuestion.imageUrl && currentQuestion.type !== 'QUOTE' && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 mb-8 shadow-xl">
                <img src={currentQuestion.imageUrl} alt="Indice" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Citations en gros texte */}
            {currentQuestion.type === 'QUOTE' && (
              <blockquote className="text-xl italic text-slate-300 text-center mb-8 border-l-4 border-blue-500 pl-4 py-2">
                "{currentQuestion.imageUrl}" {/* Remplacer par le texte de la citation */}
              </blockquote>
            )}

            {/* Options de réponses (Boutons ou Champ texte) */}
            {currentQuestion.difficulty === 'TEXT' ? (
              <form onSubmit={handleTextAnswerSubmit} className="w-full flex gap-2">
                <input 
                  type="text" 
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Tapez le nom exact..."
                  className="flex-1 bg-black/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold text-white transition-colors">
                  OK
                </button>
              </form>
            ) : (
              <div className={`grid w-full gap-3 ${currentQuestion.difficulty === 8 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {currentQuestion.options.map((opt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onSolveQuestion(opt)}
                    className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg transition-all font-medium text-slate-200 hover:text-white"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}