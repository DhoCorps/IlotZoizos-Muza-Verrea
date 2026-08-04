'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import GalakTKClient from './GalakTKClient';

interface GalakTKLobbyOrRoomProps {
  username: string;
  initialRoomId: string;
}

export default function GalakTKLobbyOrRoom({ username, initialRoomId }: GalakTKLobbyOrRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>('Secteur de ' + username);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const [gridSize, setGridSize] = useState<number>(8);
  const [totalStars, setTotalStars] = useState<number>(8);
  const [gameMode, setGameMode] = useState<'global' | 'local'>('global');

  useEffect(() => {
    const socketIo = io('http://localhost:3002');
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('[GalakTK Lobby] Connecté au serveur:', socketIo.id);
      socketIo.emit('room:get-all');
    });

    socketIo.on('room:list', (rooms: any[]) => {
      const spaceRooms = rooms.filter(r => r.gameType === 'GalakTK');
      setAvailableRooms(spaceRooms);
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    
    socket.emit('room:create', {
      username,
      roomName: roomName || `Secteur de ${username}`,
      gameType: 'GalakTK',
      galakTKGridWidth: gridSize,
      galakTKGridHeight: gridSize,
      galakTKTotalStars: totalStars,
      galakTKMode: gameMode
    });

    socket.once('room:created', (roomData: any) => {
      setRoomId(roomData.id);
      setIsInRoom(true);
    });
  };

  const handleJoinRoom = (targetRoomId: string) => {
    if (!socket) return;
    setRoomId(targetRoomId);
    setIsInRoom(true);
  };

  if (!socket) {
    return <div className="text-center text-slate-400 py-12 font-mono">Calibrage des capteurs stellaires...</div>;
  }

  if (!isInRoom) {
    return (
      <div className="max-w-xl w-full mx-auto bg-slate-900 border border-purple-900/40 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-6 text-center">
          🌌 Secteurs Galak-T-K
        </h2>

        <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nom du Secteur</label>
            <input 
              type="text" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black/50 border border-purple-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Taille Grille</label>
              <select 
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full bg-black/50 border border-purple-900/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value={6}>6 x 6</option>
                <option value={8}>8 x 8</option>
                <option value={10}>10 x 10</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Étoiles</label>
              <input 
                type="number" 
                min={3} 
                max={20}
                value={totalStars}
                onChange={(e) => setTotalStars(Number(e.target.value))}
                className="w-full bg-black/50 border border-purple-900/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Mode Capteur</label>
              <select 
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as 'global' | 'local')}
                className="w-full bg-black/50 border border-purple-900/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="global">Global (Facile)</option>
                <option value="local">Local (Difficile)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 font-bold rounded-lg transition-all text-white shadow-lg shadow-purple-600/20">
            Ouvrir le Secteur
          </button>
        </form>

        <div className="h-px w-full bg-purple-900/30 my-6" />

        <div>
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Secteurs Actifs</h3>
          {availableRooms.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4">Aucun secteur actif. Créez-en un !</p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/30 border border-purple-900/30 p-4 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Pilotes : {room.players?.filter((p: any) => p.status === 'connected').length || 0} / {room.maxPlayers || 4}</p>
                  </div>
                  <button 
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-purple-950 hover:bg-cyan-600 hover:text-white rounded-lg text-sm font-bold transition-all text-purple-200 border border-purple-800/40"
                  >
                    Embarquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <GalakTKClient socket={socket} roomId={roomId} username={username} />
  );
}