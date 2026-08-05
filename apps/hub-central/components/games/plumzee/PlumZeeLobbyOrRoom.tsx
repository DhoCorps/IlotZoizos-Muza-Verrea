'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import PlumZeeClient from './PlumZeeClient';

interface PlumZeeLobbyOrRoomProps {
  username: string;
  initialRoomId: string;
}

export default function PlumZeeLobbyOrRoom({ username, initialRoomId }: PlumZeeLobbyOrRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isInRoom, setIsInRoom] = useState<boolean>(initialRoomId !== 'default-room' && !!initialRoomId);
  const [roomName, setRoomName] = useState<string>('Boulier de ' + username);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
    const socketIo = io(SERVER_URL);
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('[PlumZee Lobby] Connecté au serveur:', socketIo.id);
      socketIo.emit('room:get-all');
    });

    socketIo.on('room:list', (rooms: any[]) => {
      const pzRooms = rooms.filter(r => r.gameType === 'PlumZee');
      setAvailableRooms(pzRooms);
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
      roomName: roomName || `Boulier de ${username}`,
      gameType: 'PlumZee',
      plumZeeMaxRounds: 13,
      plumZeeTurnTimeLimit: 60
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
    return <div className="text-center text-slate-400 py-12 font-mono">Préparation du boulier cosmique...</div>;
  }

  if (!isInRoom) {
    return (
      <div className="max-w-xl w-full mx-auto bg-slate-900 border border-amber-500/20 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400 mb-6 text-center">
          🎲 Salons Plum’Zee
        </h2>

        <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nom du Salon</label>
            <input 
              type="text" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black/50 border border-amber-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <button type="submit" className="w-full mt-2 py-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:opacity-90 font-bold rounded-lg transition-all text-white shadow-lg shadow-amber-600/20">
            Ouvrir un Boulier
          </button>
        </form>

        <div className="h-px w-full bg-amber-500/20 my-6" />

        <div>
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Bouliers Actifs</h3>
          {availableRooms.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4">Aucun boulier actif. Créez-en un !</p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/30 border border-amber-500/20 p-4 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Joueurs : {room.players?.filter((p: any) => p.status === 'connected').length || 0} / {room.maxPlayers || 4}</p>
                  </div>
                  <button 
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-amber-950 hover:bg-amber-600 hover:text-white rounded-lg text-sm font-bold transition-all text-amber-200 border border-amber-800/40"
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
    <PlumZeeClient socket={socket} roomId={roomId} username={username} />
  );
}