// apps/hub-central/components/games/wikioracle/WikiOracleLobbyOrRoom.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import WikiOracleClient from './WikiOracleClient';
import { WikiOracleChoicesMode, WikiOracleTheme } from '@ilot/shared-core';

interface WikiOracleLobbyOrRoomProps {
    username: string;
    initialRoomId: string;
}

export default function WikiOracleLobbyOrRoom({ username, initialRoomId }: WikiOracleLobbyOrRoomProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [roomId, setRoomId] = useState<string>(initialRoomId);
    const [isInRoom, setIsInRoom] = useState<boolean>(initialRoomId !== 'default-room' && !!initialRoomId);
    const [roomName, setRoomName] = useState<string>('Oracle de ' + username);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);

    const [choicesMode, setChoicesMode] = useState<WikiOracleChoicesMode>('4');
    const [theme, setTheme] = useState<WikiOracleTheme>('random');

    useEffect(() => {
        const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
        const socketIo = io(SERVER_URL);
        setSocket(socketIo);

        socketIo.on('connect', () => {
            console.log('[WikiOracle Lobby] Connecté au serveur:', socketIo.id);
            socketIo.emit('room:get-all');
        });

        socketIo.on('room:list', (rooms: any[]) => {
            const oracleRooms = rooms.filter(r => r.gameType === 'WikiOracle');
            setAvailableRooms(oracleRooms);
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
            roomName: roomName || `Oracle de ${username}`,
            gameType: 'WikiOracle',
            choicesMode,
            theme
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
        return <div className="text-center text-slate-400 py-12 font-mono">Connexion à la bibliothèque universelle...</div>;
    }

    if (!isInRoom) {
        return (
            <div className="max-w-xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-6 text-center">
                    🔮 Salons de l'Oracle de Wikipédia
                </h2>

                <form onSubmit={handleCreateRoom} className="mb-8 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Nom du Salon</label>
                        <input 
                            type="text" 
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 font-medium"
                            placeholder="Ex: Sanctuaire du Savoir..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Mode de Réponse</label>
                            <select 
                                value={choicesMode} 
                                onChange={(e) => setChoicesMode(e.target.value as WikiOracleChoicesMode)}
                                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                            >
                                <option value="0">Saisie Libre (0 choix)</option>
                                <option value="2">QCM (2 choix)</option>
                                <option value="4">QCM (4 choix)</option>
                                <option value="8">QCM (8 choix)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Thème de l'Oracle</label>
                            <select 
                                value={theme} 
                                onChange={(e) => setTheme(e.target.value as WikiOracleTheme)}
                                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                            >
                                <option value="random">Aléatoire (Tout univers)</option>
                                <option value="history">Histoire & Civilisations</option>
                                <option value="science">Sciences & Cosmos</option>
                                <option value="cinema">Cinéma & Arts</option>
                                <option value="geography">Géographie & Mondes</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-2 py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-lg transition-colors text-white shadow-lg shadow-cyan-600/20">
                        Ouvrir le Sanctuaire
                    </button>
                </form>

                <div className="h-px w-full bg-slate-800 my-6" />

                <div>
                    <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-4">Sanctuaires Actifs</h3>
                    {availableRooms.length === 0 ? (
                        <p className="text-slate-500 text-sm italic text-center py-4">Aucun sanctuaire ouvert. Créez le vôtre !</p>
                    ) : (
                        <div className="space-y-3">
                            {availableRooms.map((room) => (
                                <div key={room.id} className="flex items-center justify-between bg-black/30 border border-slate-800 p-4 rounded-xl">
                                    <div>
                                        <h4 className="font-bold text-white">{room.name}</h4>
                                        <p className="text-xs text-slate-400 font-mono">
                                            Thème : {room.theme || 'Aléatoire'} | Joueurs : {room.players?.filter((p: any) => p.status === 'connected').length || 0}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleJoinRoom(room.id)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-cyan-600 hover:text-white rounded-lg text-sm font-bold transition-all"
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
        <WikiOracleClient socket={socket} roomId={roomId} username={username} />
    );
}