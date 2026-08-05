'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import CineMaxBoard from './CineMaxBoard'; 

interface CineMaxRoomClientProps {
  roomId: string;
  username: string;
  playerId: string; // L'ID unique ou socket.id du joueur
}

export default function CineMaxRoomClient({ roomId, username, playerId }: CineMaxRoomClientProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pelliculeBlur, setPelliculeBlur] = useState<number>(100);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isBuzzerLocked, setIsBuzzerLocked] = useState<boolean>(false);
  const [pendingDifficultyChoice, setPendingDifficultyChoice] = useState<boolean>(true);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Connexion au serveur Socket.IO avec variable d'env
    const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
    const socketIo = io(SERVER_URL);
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('[CineMax Client] Connecté à la canopée, rejoint le salon:', roomId);
      socketIo.emit('room:join', { roomId, username });
    });

    // 2. Écoute des mises à jour globales de la salle
    socketIo.on('game:state-update', (roomData: any) => {
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
    });

    // 3. Écoute des mises à jour personnelles
    socketIo.on('cinemax:personal-update', (data: any) => {
      if (data.currentQuestion) setCurrentQuestion(data.currentQuestion);
      setPendingDifficultyChoice(data.pendingDifficultyChoice);
    });

    // 4. Déblocage du buzzer après pénalité
    socketIo.on('cinemax:buzzer-unlocked', () => {
      setIsBuzzerLocked(false);
      setErrorMessage(null);
    });

    // 5. Gestion des erreurs du serveur
    socketIo.on('error:message', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socketIo.disconnect();
    };
  }, [roomId, username, playerId]);

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