'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import CrazyMorpionClient from './CrazyMorpionClient';

interface CrazyMorpionLobbyOrRoomProps {
  username: string;
  initialRoomId: string;
}

export default function CrazyMorpionLobbyOrRoom({ username, initialRoomId }: CrazyMorpionLobbyOrRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isInRoom, setIsInRoom] = useState<boolean>(initialRoomId !== 'default-room' && !!initialRoomId);
  const [roomName, setRoomName] = useState<string>('Salon de ' + username);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
    const socketIo = io(SERVER_URL);
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('[CrazyMorpion Lobby] Connecté au serveur:', socketIo.id);
      socketIo.emit('room:get-all');
    });

    socketIo.on('room:list', (rooms: any[]) => {
      const crazyRooms = rooms.filter(r => r.gameType === 'CrazyMorpion');
      setAvailableRooms(crazyRooms);
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
      roomName: roomName || `Salon de ${username}`,
      gameType: 'CrazyMorpion'
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
    return <div className="text-center text-slate-400 py-12 font-mono">Connexion à la canopée en cours...</div>;
  }

  if (!isInRoom) {
    return (
      <div className="max-w-xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6 text-center">
          ❌⭕ Salons CrazyMorpion
        </h2>

        {/* Création de salon */}
        <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nom du Salon</label>
            <input 
              type="text" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: Duel au sommet..."
            />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition-colors text-white shadow-lg shadow-blue-600/20">
            Créer un Salon
          </button>
        </form>

        <div className="h-px w-full bg-slate-800 my-6" />

        {/* Liste des salons existants */}
        <div>
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Salons Disponibles</h3>
          {availableRooms.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4">Aucun salon actif pour le moment. Créez-en un !</p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/30 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Joueurs : {room.players?.length || 0} / {room.maxPlayers || 2}</p>
                  </div>
                  <button 
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all"
                  >
                    Rejoindre
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
    <CrazyMorpionClient socket={socket} roomId={roomId} username={username} />
  );
}