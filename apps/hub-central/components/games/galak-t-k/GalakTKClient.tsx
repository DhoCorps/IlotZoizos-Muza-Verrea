// apps/hub-central/components/games/galaktk/GalakTKClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { GalakTKRoomToSend } from '@ilot/shared-core';
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface GalakTKClientProps {
  roomId: string;
  username: string;
}

// Définition de l'interface de cellule pour éviter le 'any'
interface CellData {
  isRadioactive?: boolean;
  isNest?: boolean;
  owner?: 'player1' | 'player2' | 'tie' | null;
  // Ajoute d'autres propriétés si nécessaire selon ton modèle
}

export default function GalakTKClient({ roomId, username }: GalakTKClientProps) {
  const { socket, isConnected } = useGameSocket();
  const [gameState, setGameState] = useState<GalakTKRoomToSend | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 1. Déclaration stricte des écouteurs
    const handleConnect = () => {
      console.log('[Galak-T-K] Connecté au secteur.');
      socket.emit('room:join', { roomId, username });
    };

    const handleStateUpdate = (data: GalakTKRoomToSend) => {
      if (data.gameType === 'GalakTK') {
        setGameState(data);
        setErrorMsg(null);
      }
    };

    const handleErrorMessage = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    };

    // 2. Attachement des écouteurs
    socket.on('connect', handleConnect);
    socket.on('room:joined', handleStateUpdate);
    socket.on('game:state-update', handleStateUpdate);
    socket.on('error:message', handleErrorMessage);

    // Initialisation
    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    // 3. Nettoyage ciblé pour le mode Strict
    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleStateUpdate);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('error:message', handleErrorMessage);
    };
  }, [socket, roomId, username, isConnected]);

  const handleCellClick = (x: number, y: number) => {
    if (!socket || gameState?.state !== 'playing') return;
    if (gameState.currentTurnPlayerId !== socket.id) {
      setErrorMsg("Ce n'est pas votre tour de sonder !");
      return;
    }

    socket.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'GalakTK',
      action: 'CLICK_CELL',
      payload: { position: { x, y } }
    });
  };

  const handleCellRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    if (!socket || gameState?.state !== 'playing') return;

    const me = gameState.players.find(p => p.id === socket.id);
    const existingMark = me?.markedCells?.find(m => m.x === x && m.y === y);
    
    let nextStatus: 'empty' | 'star' | 'unknown' = 'empty';
    if (!existingMark || existingMark.status === 'unknown') nextStatus = 'empty';
    else if (existingMark.status === 'empty') nextStatus = 'star';
    else nextStatus = 'unknown';

    socket.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'GalakTK',
      action: 'MARK_CELL',
      payload: { position: { x, y }, markStatus: nextStatus }
    });
  };

  if (!gameState) return <div className="text-center text-slate-400 py-12 font-mono">Chargement du secteur Galak-T-K...</div>;

  const me = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.currentTurnPlayerId === socket?.id;
  const gridWidth = gameState.gameOptions?.gridWidth || 8;
  const gridHeight = gameState.gameOptions?.gridHeight || 8;

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col items-center gap-6">
      
      {/* GRILLE SPATIALE & CLASSEMENT */}
      <div className="w-full bg-slate-900 rounded-2xl p-6 border border-purple-900/30 shadow-xl flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-purple-900/30">
          <div>
            <h2 className="text-2xl font-black text-white">{gameState.name}</h2>
            <p className="text-xs font-mono text-cyan-400">
              Tour de : <span className="font-bold text-white">{gameState.players.find(p => p.id === gameState.currentTurnPlayerId)?.username || '...'}</span>
              {isMyTurn && <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40 text-[10px]">C'est à vous !</span>}
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-400">
            Mode : <span className="text-purple-300 uppercase">{gameState.gameOptions.mode}</span> | Étoiles : {me?.starsFoundCount || 0} / {gameState.gameOptions.totalStars}
          </div>
        </div>

        {errorMsg && <div className="w-full mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center text-sm">{errorMsg}</div>}

        {gameState.state === 'gameOver' && (
          <div className="w-full mb-4 p-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-cyan-500/30 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-1">Fin de la Mission Spatiale !</h3>
            <p className="text-sm text-slate-300">Commandant victorieux : {gameState.players.find(p => p.id === gameState.winnerId)?.username || 'Personne'}</p>
          </div>
        )}

        {/* Tableau des Pilotes */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {gameState.players.map(p => (
            <div key={p.id} className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col items-center">
              <span className={`text-xs font-medium truncate max-w-full ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                {p.username} {p.id === socket?.id && '(Moi)'} {gameState.currentTurnPlayerId === p.id && '🟢'}
              </span>
              <span className="mt-1 bg-purple-950 text-purple-300 border border-purple-800/40 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                {p.starsFoundCount} ⭐ ({p.turnsTaken}c)
              </span>
            </div>
          ))}
        </div>

        {/* LE PLATEAU DE JEU */}
        <div 
          className="grid gap-1.5 p-4 bg-black/60 rounded-xl border border-purple-900/40 shadow-inner overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridHeight }).map((_, y) => 
            Array.from({ length: gridWidth }).map((_, x) => {
              const key = `${x},${y}`;
              const isFoundStar = me?.foundStarPositions?.some(s => s.x === x && s.y === y);
              const mark = me?.markedCells?.find(m => m.x === x && m.y === y);

              return (
                <button
                  key={key}
                  onClick={() => handleCellClick(x, y)}
                  onContextMenu={(e) => handleCellRightClick(e, x, y)}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all border ${
                    isFoundStar 
                      ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20' 
                      : mark?.status === 'empty'
                      ? 'bg-slate-800/50 border-slate-700 text-slate-600'
                      : mark?.status === 'star'
                      ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                      : 'bg-slate-900/80 hover:bg-purple-950/60 border-purple-900/50 text-slate-300'
                  }`}
                >
                  {isFoundStar ? '⭐' : mark?.status === 'empty' ? '·' : mark?.status === 'star' ? '🎯' : ''}
                </button>
              );
            })
          )}
        </div>
        <p className="text-[11px] font-mono text-slate-500 mt-3">💡 Clic gauche pour sonder • Clic droit pour marquer (· / 🎯)</p>
      </div>

    </div>
  );
}