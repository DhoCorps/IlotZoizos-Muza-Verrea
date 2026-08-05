'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AtomikClient from './AtomikKFarClient';

interface AtomikLobbyProps {
  username: string;
  initialRoomId: string;
}

export default function AtomikLobbyOrRoom({ username, initialRoomId }: AtomikLobbyProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isInRoom, setIsInRoom] = useState<boolean>(!!initialRoomId);
  const [roomName, setRoomName] = useState<string>('Bunker de ' + username);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const [gridOption, setGridOption] = useState('Sonic'); 

  useEffect(() => {
    const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
    const socketIo = io(SERVER_URL);
    setSocket(socketIo);

    socketIo.on('connect', () => {
      socketIo.emit('room:get-all');
    });

    socketIo.on('room:list', (rooms: any[]) => {
      setAvailableRooms(rooms.filter(r => r.gameType === 'AtomikKFardE'));
    });

    return () => { socketIo.disconnect(); };
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    
    socket.emit('room:create', {
      username,
      roomName,
      gameType: 'AtomikKFardE',
      atomikKFardENbPlayer: 'duo',
      atomikKFardEMode: 'Stratege',
      atomikKFardEOption: gridOption,
      atomikKFardEGameStyle: 'Conquête',
      atomikKFardETimePerRound: 60
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

  if (!socket) return <div className="font-mono text-purple-400">Calibrage des compteurs Geiger...</div>;

  if (!isInRoom) {
    return (
      <div className="max-w-xl w-full mx-auto bg-[#1a1a24] border border-purple-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(138,43,226,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />
        
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-400 mb-6 text-center tracking-widest">
          Silos de Déploiement
        </h2>

        <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Nom du Champ de Bataille</label>
            <input 
              type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Taille du Territoire</label>
            <select 
              value={gridOption} onChange={(e) => setGridOption(e.target.value)}
              className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400 font-mono"
            >
              <option value="Sonic">Sonic (Escarmouche 3x3)</option>
              <option value="Alex Kid">Alex Kid (Bataille 6x6)</option>
              <option value="Megaman">Megaman (Guerre 9x9)</option>
            </select>
          </div>

          <button type="submit" className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-red-600 hover:opacity-90 font-black tracking-widest rounded-lg transition-all text-white shadow-lg shadow-red-600/20">
            DÉPLOYER
          </button>
        </form>

        <div className="h-px w-full bg-purple-500/20 my-6" />

        <div>
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Silos Actifs</h3>
          {availableRooms.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4 font-mono">Aucun conflit en cours.</p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/40 border border-purple-500/20 p-4 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">Artilleurs : {room.players?.filter((p:any) => p.status === 'connected').length || 0} / {room.maxPlayers}</p>
                  </div>
                  <button onClick={() => handleJoinRoom(room.id)} className="px-4 py-2 bg-purple-900/50 hover:bg-purple-600 rounded-lg text-sm font-bold transition-all text-purple-200 border border-purple-500/50">
                    S'infiltrer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <AtomikClient socket={socket} roomId={roomId} username={username} />;
}