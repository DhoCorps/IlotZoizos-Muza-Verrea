// apps/hub-central/components/games/cinemax/CineMaxRoomClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import CineMaxBoard from './CineMaxBoard'; 
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface CineMaxRoomClientProps {
  roomId: string;
  username: string;
  playerId: string; // L'ID unique ou socket.id du joueur
}

export default function CineMaxRoomClient({ roomId, username, playerId }: CineMaxRoomClientProps) {
  const { socket, isConnected } = useGameSocket();
  const [pelliculeBlur, setPelliculeBlur] = useState<number>(100);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isBuzzerLocked, setIsBuzzerLocked] = useState<boolean>(false);
  const [pendingDifficultyChoice, setPendingDifficultyChoice] = useState<boolean>(true);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 1. Déclaration stricte des écouteurs pour pouvoir les retirer
    const handleConnect = () => {
      console.log('[CineMax Client] Connecté à la canopée, rejoint le salon:', roomId);
      socket.emit('room:join', { roomId, username });
    };

    const handleStateUpdate = (roomData: any) => {
      if (roomData.gameType === 'CineMax') {
        setPelliculeBlur(roomData.pelliculeBlur);
        setPosterUrl(roomData.targetMoviePoster ? `https://image.tmdb.org/t/p/w500${roomData.targetMoviePoster}` : null);

        // Retrouver l'état propre du joueur connecté dans la liste
        const me = roomData.players.find((p: any) => p.id === playerId || p.username === username);
        if (me) {
          setErrorCount(me.errorCount || 0);
          setIsBuzzerLocked(me.isBuzzerLocked || false);
          setPendingDifficultyChoice(me.pendingDifficultyChoice || false);
          if (me.currentQuestion) {
            setCurrentQuestion(me.currentQuestion);
          }
        }
      }
    };

    const handlePersonalUpdate = (data: any) => {
      if (data.currentQuestion) setCurrentQuestion(data.currentQuestion);
      setPendingDifficultyChoice(data.pendingDifficultyChoice);
    };

    const handleBuzzerUnlocked = () => {
      setIsBuzzerLocked(false);
      setErrorMessage(null);
    };

    const handleErrorMessage = (msg: string) => {
      setErrorMessage(msg);
      // Nettoyage automatique du message d'erreur
      setTimeout(() => setErrorMessage(null), 4000);
    };

    // 2. Attachement des écouteurs
    socket.on('connect', handleConnect);
    socket.on('game:state-update', handleStateUpdate);
    socket.on('cinemax:personal-update', handlePersonalUpdate);
    socket.on('cinemax:buzzer-unlocked', handleBuzzerUnlocked);
    socket.on('error:message', handleErrorMessage);

    // Si le socket est déjà connecté au montage, on rejoint directement
    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    // 3. Nettoyage chirurgical pour le mode Strict
    return () => {
      // Optionnel : avertir le serveur du départ si le composant est démonté
      socket.emit('room:leave', { roomId });

      // Retrait exclusif des écouteurs de cette instance
      socket.off('connect', handleConnect);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('cinemax:personal-update', handlePersonalUpdate);
      socket.off('cinemax:buzzer-unlocked', handleBuzzerUnlocked);
      socket.off('error:message', handleErrorMessage);
    };
  }, [socket, roomId, username, playerId, isConnected]);

  // --- ACTIONS ENVOYÉES AU SERVEUR ---

  const handleSelectDifficulty = (difficulty: any) => {
    if (!socket) return;
    socket.emit('game:make-move', {
      gameType: 'CineMax',
      roomId,
      playerId,
      action: 'SELECT_DIFFICULTY',
      payload: { difficulty }
    });
  };

  const handleSolveQuestion = (answer: string) => {
    if (!socket) return;
    socket.emit('game:make-move', {
      gameType: 'CineMax',
      roomId,
      playerId,
      action: 'SOLVE_QUESTION',
      payload: { answer }
    });
  };

  const handleHitBuzzer = (movieTitle: string) => {
    if (!socket) return;
    socket.emit('game:make-move', {
      gameType: 'CineMax',
      roomId,
      playerId,
      action: 'HIT_BUZZER',
      payload: { movieTitle }
    });
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Affichage temporaire des erreurs système si besoin */}
      {errorMessage && (
        <div className="mb-4 bg-red-900/80 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm font-mono animate-bounce z-50">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Le Plateau Visuel */}
      <CineMaxBoard 
        pelliculeBlur={pelliculeBlur}
        posterUrl={posterUrl}
        errorCount={errorCount}
        isBuzzerLocked={isBuzzerLocked}
        pendingDifficultyChoice={pendingDifficultyChoice}
        currentQuestion={currentQuestion}
        onSelectDifficulty={handleSelectDifficulty}
        onSolveQuestion={handleSolveQuestion}
        onHitBuzzer={handleHitBuzzer}
      />
    </div>
  );
}