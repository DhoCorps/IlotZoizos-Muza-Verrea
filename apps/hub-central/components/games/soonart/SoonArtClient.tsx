'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SoonArtRoomToSend } from '@ilot/shared-core';

interface SoonArtClientProps {
  socket: Socket;
  roomId: string;
  username: string;
}

type ToolMode = 'scan' | 'mark';

export default function SoonArtClient({ socket, roomId, username }: SoonArtClientProps) {
  const [gameState, setGameState] = useState<SoonArtRoomToSend | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [toolMode, setToolMode] = useState<ToolMode>('scan');

  // Gestion du clic-glissé pour les cercles
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) {
      socket.emit('room:join', { roomId, username });
    }

    const handleConnect = () => {
      socket.emit('room:join', { roomId, username });
    };

    const handleStateUpdate = (data: SoonArtRoomToSend) => {
      if (data.gameType === 'SoonArt') {
        setGameState(data);
        setErrorMsg(null);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('room:joined', handleStateUpdate);
    socket.on('game:init', handleStateUpdate);
    socket.on('game:state-update', handleStateUpdate);
    socket.on('error:message', (msg: string) => setErrorMsg(msg));

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleStateUpdate);
      socket.off('game:init', handleStateUpdate);
      socket.off('game:state-update', handleStateUpdate);
      socket.off('error:message');
    };
  }, [socket, roomId, username]);

  // Gestion des interactions SVG (Souris)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || gameState?.state !== 'playing') return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === 'scan') {
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentRadius(0);
    } else if (toolMode === 'mark') {
      socket?.emit('game:make-move', {
        roomId,
        playerId: socket.id,
        gameType: 'SoonArt',
        action: 'PLACE_GUESS',
        payload: { position: { x, y } }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - startPoint.x;
    const dy = y - startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    setCurrentRadius(radius);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || currentRadius < 5) {
      setIsDrawing(false);
      setStartPoint(null);
      return;
    }

    socket?.emit('game:make-move', {
      roomId,
      playerId: socket.id,
      gameType: 'SoonArt',
      action: 'DRAW_CIRCLE',
      payload: {
        center: startPoint,
        radius: Math.round(currentRadius)
      }
    });

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRadius(0);
  };

  if (!gameState) return <div className="text-center text-slate-400 py-12 font-mono">Chargement de la toile Soon'Art...</div>;

  const mapWidth = gameState.gameOptions?.mapWidth || 800;
  const mapHeight = gameState.gameOptions?.mapHeight || 600;

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col items-center gap-6">
      
      {/* ZONE CENTRALE : LA TOILE / CARTE */}
      <div className="w-full bg-slate-900 rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col items-center">
        
        {/* Header du plateau */}
        <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-black text-white">{gameState.name}</h2>
            <p className="text-xs font-mono text-slate-400">Trésors totaux : {gameState.gameOptions.totalTreasures}</p>
          </div>

          {/* Outils / Modes */}
          {gameState.state === 'playing' && (
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
              <button 
                onClick={() => setToolMode('scan')}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${toolMode === 'scan' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                🔍 Mode Scan (Cercle)
              </button>
              <button 
                onClick={() => setToolMode('mark')}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${toolMode === 'mark' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                🚩 Mode Trésor (Marqueur)
              </button>
            </div>
          )}
        </div>

        {errorMsg && <div className="w-full mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center text-sm">{errorMsg}</div>}

        {gameState.state === 'gameOver' && (
          <div className="w-full mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 rounded-xl text-center">
            <h3 className="text-xl font-bold text-white mb-1">Fin de l'Exposition !</h3>
            <p className="text-sm text-slate-300">Vainqueur : {gameState.players.find(p => p.id === gameState.winnerId)?.username || 'Personne'}</p>
          </div>
        )}

        {/* Tableau des Artistes */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {gameState.players.map(p => (
            <div key={p.id} className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex flex-col items-center">
              <span className={`text-xs font-medium truncate max-w-full ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                {p.username} {p.id === socket?.id && '(Moi)'}
              </span>
              <span className="mt-1 bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        {/* LA TOILE INTERACTIVE SVG */}
        <div className="relative border-2 border-slate-800 rounded-xl overflow-hidden cursor-crosshair bg-black/60 shadow-inner">
          <svg
            ref={svgRef}
            width={mapWidth}
            height={mapHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-auto max-h-[600px] block"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Affichage des cercles tracés par les joueurs */}
            {gameState.circles?.map((c) => (
              <g key={c.id}>
                <circle
                  cx={c.center.x}
                  cy={c.center.y}
                  r={c.radius}
                  fill={c.colorScheme}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                />
                <circle cx={c.center.x} cy={c.center.y} r={3} fill="#ffffff" />
                <text x={c.center.x} y={c.center.y - 8} fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold" className="drop-shadow">
                  {c.treasureCount} 💎
                </text>
              </g>
            ))}

            {/* Cercle en cours de tracé */}
            {isDrawing && startPoint && currentRadius > 0 && (
              <circle
                cx={startPoint.x}
                cy={startPoint.y}
                r={currentRadius}
                fill="rgba(245, 158, 11, 0.15)"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4"
              />
            )}

            {/* Trésors découverts */}
            {gameState.treasures?.map((t) => (
              t.isDiscovered && t.position.x !== -1 && (
                <g key={t.id}>
                  <circle cx={t.position.x} cy={t.position.y} r={12} fill="#10b981" className="animate-ping opacity-75" />
                  <circle cx={t.position.x} cy={t.position.y} r={10} fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <text x={t.position.x} y={t.position.y + 4} fill="#000000" fontSize="10" textAnchor="middle" fontWeight="black">💎</text>
                </g>
              )
            ))}

            {/* Estimations (guesses) des joueurs */}
            {gameState.players?.flatMap(p => p.guesses || []).map((g) => (
              <g key={g.id}>
                <circle cx={g.position.x} cy={g.position.y} r={6} fill={g.matchedTreasureId ? '#10b981' : '#f43f5e'} stroke="#ffffff" strokeWidth="1.5" />
              </g>
            ))}
          </svg>
        </div>
      </div>

    </div>
  );
}