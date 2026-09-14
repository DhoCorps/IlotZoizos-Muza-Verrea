'use client';

import React, { useEffect, useState } from 'react';
import CineMaxBoard from './CineMaxBoard'; 
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';
import { useSearchParams } from 'next/navigation';
import { CineMaxDifficulty } from '@ilot/shared-core';

interface CineMaxRoomClientProps {
  roomId: string;
  username: string;
  playerId: string;
}

export default function CineMaxRoomClient({ roomId, username, playerId }: CineMaxRoomClientProps) {
  const { socket, isConnected } = useGameSocket();
  const searchParams = useSearchParams();

  const [pelliculeBlur, setPelliculeBlur] = useState<number>(100);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isBuzzerLocked, setIsBuzzerLocked] = useState<boolean>(false);
  const [pendingDifficultyChoice, setPendingDifficultyChoice] = useState<boolean>(true);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const wagerAmount = Number(searchParams.get('wager') || '0');
    const wagerCurrency = searchParams.get('currency') || 'DHO';

    const handleConnect = () => {
      console.log('[CineMax Client] Connecté à la canopée, rejoint le salon:', roomId);
      socket.emit('room:join', { 
        roomId, 
        username,
        wagerAmount: wagerAmount > 0 ? wagerAmount : undefined,
        wagerCurrency: wagerAmount > 0 ? wagerCurrency : undefined
      });
    };

    const handleStateUpdate = (roomData: any) => {
      if (roomData.gameType === 'CineMax') {
        setPelliculeBlur(roomData.pelliculeBlur);
        setPosterUrl(roomData.targetMoviePoster ? `https://image.tmdb.org/t/p/w500${roomData.targetMoviePoster}` : null);

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
      setTimeout(() => setErrorMessage(null), 4000);
    };

    socket.on('connect', handleConnect);
    socket.on('game:state-update', handleStateUpdate);
    socket.on('cinemax:personal-update', handlePersonalUpdate);
    socket.on('cinemax:buzzer-unlocked', handleBuzzerUnlocked);
    socket.on('error:message', handleErrorMessage);

    if (socket.connected) {
      socket.emit('room:join', { 
        roomId, 
        username,
        wagerAmount: wagerAmount > 0 ? wagerAmount : undefined,
        wagerCurrency: wagerAmount > 0 ? wagerCurrency : undefined
      });
    }

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', handleConnect);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('cinemax:personal-update', handlePersonalUpdate);
      socket.off('cinemax:buzzer-unlocked', handleBuzzerUnlocked);
      socket.off('error:message', handleErrorMessage);
    };
  }, [socket, roomId, username, playerId, isConnected, searchParams]);

  const handleSelectDifficulty = (difficulty: CineMaxDifficulty) => {
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
      {errorMessage && (
        <div className="mb-4 bg-red-900/80 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm font-mono animate-bounce z-50">
          ⚠️ {errorMessage}
        </div>
      )}

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