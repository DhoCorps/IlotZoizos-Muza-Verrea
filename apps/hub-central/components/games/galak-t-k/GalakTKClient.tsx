'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GalakTKRoomToSend, ChatMessage } from '@ilot/shared-core';

interface GalakTKClientProps {
  socket: Socket;
  roomId: string;
  username: string;
}

export default function GalakTKClient({ socket, roomId, username }: GalakTKClientProps) {
  const [gameState, setGameState] = useState<GalakTKRoomToSend | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    const handleConnect = () => {
      socket.emit('room:join', { roomId, username });
    };

    const handleStateUpdate = (data: GalakTKRoomToSend) => {
      if (data.gameType === 'GalakTK') {
        setGameState(data);
        setErrorMsg(null);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('room:joined', handleStateUpdate);
    socket.on('game:state-update', handleStateUpdate);

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('error:message', (msg: string) => setErrorMsg(msg));

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleStateUpdate);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('chat:message');
      socket.off('error:message');
    };
  }, [socket, roomId, username]);

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

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat:send-message', {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      senderUsername: username,
      senderId: socket.id,
      text: chatInput.trim(),
      roomId,
      timestamp: Date.now()
    });
    setChatInput('');
  };

  if (!gameState) return <div className="text-center text-slate-400 py-12 font-mono">Chargement du secteur Galak-T-K...</div>;

  const me = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.currentTurnPlayerId === socket?.id;
  const gridWidth = gameState.gameOptions?.gridWidth || 8;
  const gridHeight = gameState.gameOptions?.gridHeight || 8;

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
      
      {/* GRILLE SPATIALE */}
      <div className="flex-[3] bg-slate-900 rounded-2xl p-6 border border-purple-900/30 shadow-xl flex flex-col items-center">
        
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

        {/* LE PLATEAU DE JEU */}
        <div 
          className="grid gap-1.5 p-4 bg-black/60 rounded-xl border border-purple-900/40 shadow-inner"
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

      {/* CLASSEMENT & CHAT */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-slate-900 rounded-2xl border border-purple-900/30 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Pilotes & Radar</h3>
          <div className="space-y-3">
            {gameState.players.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className={`font-medium ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {p.username} {p.id === socket?.id && '(Moi)'} {gameState.currentTurnPlayerId === p.id && '🟢'}
                </span>
                <span className="bg-purple-950 text-purple-300 border border-purple-800/40 text-xs font-bold px-3 py-1 rounded-full font-mono">
                  {p.starsFoundCount} ⭐ ({p.turnsTaken} coups)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-slate-900 rounded-2xl border border-purple-900/30 flex flex-col shadow-xl overflow-hidden min-h-[300px]">
          <div className="p-3.5 border-b border-purple-900/30 bg-slate-800/40 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Communications Spatiales
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map(msg => {
              const isMe = msg.senderId === socket?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-1">{msg.senderUsername}</span>
                  <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm ${isMe ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={handleSendChat} className="p-3 border-t border-purple-900/30 bg-slate-800/40 flex gap-2">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              placeholder="Message..." 
              className="flex-1 bg-black/50 border border-purple-900/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
              Envoyer
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}