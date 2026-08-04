'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import KoOonTreeZClient from './KoOonTreeZClient';
import { KoOonTreezNbPlayer, KoOonTreezMode, KoOonTreezOption, KoOonTreezLevel, KoOonTreezSoloMode } from '@ilot/shared-core';

interface KoOonTreeZLobbyOrRoomProps {
  username: string;
  initialRoomId: string;
}

export default function KoOonTreeZLobbyOrRoom({ username, initialRoomId }: KoOonTreeZLobbyOrRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>('Expédition de ' + username);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // Options de jeu sélectionnables pour la création
  const [nbPlayer, setNbPlayer] = useState<KoOonTreezNbPlayer>('duo');
  const [mode, setMode] = useState<KoOonTreezMode>('DvsP');
  const [option, setOption] = useState<KoOonTreezOption>('Champ-De-Bataille');
  const [level, setLevel] = useState<KoOonTreezLevel>('normal');
  const [soloMode, setSoloMode] = useState<KoOonTreezSoloMode>('training');

  useEffect(() => {
    const socketIo = io('http://localhost:3002');
    setSocket(socketIo);

    socketIo.on('connect', () => {
      console.log('[KoOonTreeZ Lobby] Connecté au serveur:', socketIo.id);
      socketIo.emit('room:get-all');
    });

    socketIo.on('room:list', (rooms: any[]) => {
      const kooonRooms = rooms.filter(r => r.gameType === 'KoOonTreeZ');
      setAvailableRooms(kooonRooms);
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
      roomName: roomName || `Expédition de ${username}`,
      gameType: 'KoOonTreeZ',
      kooonTreezNbPlayer: nbPlayer,
      kooonTreezMode: mode,
      kooonTreezOption: option,
      kooonTreezLevel: level,
      kooonTreezSoloMode: soloMode
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
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 text-center">
          🌍 Salons KoOonTreeZ
        </h2>

        {/* Formulaire de création de salon */}
        <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nom de l'Expédition</label>
            <input 
              type="text" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-medium"
              placeholder="Ex: Tour du monde express..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nombre de Joueurs</label>
              <select 
                value={nbPlayer} 
                onChange={(e) => setNbPlayer(e.target.value as KoOonTreezNbPlayer)}
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="solo">Solo</option>
                <option value="duo">Duo (2 joueurs)</option>
                <option value="trio">Trio (3 joueurs)</option>
                <option value="quad">Quad (4 joueurs)</option>
                <option value="battle-royale">Battle Royale</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Niveau</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value as KoOonTreezLevel)}
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="easy">Facile (2 choix)</option>
                <option value="average">Moyen</option>
                <option value="normal">Normal</option>
                <option value="hard">Difficile</option>
                <option value="impossible">Impossible</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Mode de Jeu</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as KoOonTreezMode)}
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="DvsP">Drapeau ➔ Pays</option>
                <option value="PvsD">Pays ➔ Drapeau</option>
                <option value="DvsC">Drapeau ➔ Capitale</option>
                <option value="CvsD">Capitale ➔ Drapeau</option>
                <option value="PvsC">Pays ➔ Capitale</option>
                <option value="CvsP">Capitale ➔ Pays</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Option / Objectif</label>
              <select 
                value={option} 
                onChange={(e) => setOption(e.target.value as KoOonTreezOption)}
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Blitzkrieg">Blitzkrieg (5 drapeaux)</option>
                <option value="Champ-De-Bataille">Champ-de-Bataille (10 drapeaux)</option>
                <option value="Sur-Le-Front">Sur le Front (15 drapeaux)</option>
                <option value="Campagne">Campagne (20 drapeaux)</option>
                <option value="Guerre-Totale">Guerre Totale (30 drapeaux)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg transition-colors text-white shadow-lg shadow-emerald-600/20">
            Créer l'Expédition
          </button>
        </form>

        <div className="h-px w-full bg-slate-800 my-6" />

        {/* Liste des salons existants */}
        <div>
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Expéditions Actives</h3>
          {availableRooms.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4">Aucune expédition en cours. Créez la vôtre !</p>
          ) : (
            <div className="space-y-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/30 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white">{room.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Mode: {room.kooonTreezMode} | Joueurs : {room.players?.filter((p: any) => p.status === 'connected').length || 0} / {room.maxPlayers || 2}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-bold transition-all"
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
    <KoOonTreeZClient socket={socket} roomId={roomId} username={username} />
  );
}