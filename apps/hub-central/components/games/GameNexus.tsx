// apps/hub-central/components/games/GameNexus.tsx
'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomToSend } from '@ilot/shared-core';

// Composants de jeux à implémenter par la suite
import CrazyMorpionClient from './crazymorpion/CrazyMorpionClient';
import KoOonTreeZClient from './kooontreez/KoOonTreeZClient';

const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';

interface GameNexusProps {
    username: string;
}

type GameTypeSelection = 'CrazyMorpion' | 'KoOonTreeZ' | 'AtomikKFardE';

export default function GameNexus({ username }: GameNexusProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeRooms, setActiveRooms] = useState<RoomToSend[]>([]);
    
    // État de navigation
    const [currentView, setCurrentView] = useState<'lobby' | 'playing'>('lobby');
    const [activeGameType, setActiveGameType] = useState<GameTypeSelection | null>(null);
    const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);

    // Formulaire de base
    const [selectedGameToCreate, setSelectedGameToCreate] = useState<GameTypeSelection>('CrazyMorpion');
    const [newRoomName, setNewRoomName] = useState('');

    // --- ÉTATS : OPTIONS KOOONTREEZ ---
    const [ktMode, setKtMode] = useState('');
    const [ktNbPlayer, setKtNbPlayer] = useState('');
    const [ktOption, setKtOption] = useState('');
    const [ktLevel, setKtLevel] = useState('');
    const [ktSoloMode, setKtSoloMode] = useState('');

    // --- ÉTATS : OPTIONS ATOMIK-K-FARD(E) ---
    const [akOption, setAkOption] = useState('');
    const [akMode, setAkMode] = useState('');
    const [akStyle, setAkStyle] = useState('');
    const [akNbPlayer, setAkNbPlayer] = useState('');
    const [akTime, setAkTime] = useState('');
    const [akTeamMode, setAkTeamMode] = useState('');

    // --- 1. CONNEXION INITIALE ---
    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[NEXUS] Connecté au serveur de jeu.');
            newSocket.emit('room:get-all'); 
        });

        newSocket.on('room:list', (rooms: RoomToSend[]) => {
            setActiveRooms(rooms);
        });

        newSocket.on('room:joined', (roomData: RoomToSend) => {
            setJoinedRoomId(roomData.id);
            setActiveGameType(roomData.gameType as GameTypeSelection);
            setCurrentView('playing');
        });

        newSocket.on('game:init', (roomData: RoomToSend) => {
            setJoinedRoomId(roomData.id);
            setActiveGameType(roomData.gameType as GameTypeSelection);
            setCurrentView('playing');
        });

        newSocket.on('error:message', (msg: string) => {
            alert(`Erreur de la Matrice : ${msg}`); 
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // --- 2. ACTIONS DU LOBBY ---
    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket) return;

        const payload: any = {
            username,
            roomName: newRoomName || `Salon de ${username}`,
            gameType: selectedGameToCreate,
        };

        // Injection des paramètres spécifiques au jeu choisi
        if (selectedGameToCreate === 'KoOonTreeZ') {
            if (ktNbPlayer) payload.kooonTreezNbPlayer = ktNbPlayer;
            if (ktMode) payload.kooonTreezMode = ktMode;
            if (ktOption) payload.kooonTreezOption = ktOption;
            if (ktLevel) payload.kooonTreezLevel = ktLevel;
            if (ktSoloMode && ktNbPlayer === 'solo') payload.kooonTreezSoloMode = ktSoloMode;
        }

        if (selectedGameToCreate === 'AtomikKFardE') {
            if (akOption) payload.atomikKfardeOption = akOption;
            if (akMode) payload.atomikKfardeMode = akMode;
            if (akStyle) payload.atomikKfardeGameStyle = akStyle;
            if (akNbPlayer) payload.atomikKfardeNbPlayer = akNbPlayer;
            if (akTime) payload.atomikKfardeTimePerRound = parseInt(akTime, 10);
            if (akTeamMode) payload.atomikKfardeTeamMode = akTeamMode;
        }

        socket.emit('room:create', payload);
    };

    const handleJoinRoom = (roomId: string) => {
        if (!socket) return;
        socket.emit('room:join', { roomId, username });
    };

    const handleLeaveGame = () => {
        if (!socket || !joinedRoomId) return;
        socket.emit('room:leave', { roomId: joinedRoomId });
        setCurrentView('lobby');
        setActiveGameType(null);
        setJoinedRoomId(null);
    };

    // --- 3. VUE : EN JEU ---
    if (currentView === 'playing' && socket && joinedRoomId) {
        return (
            <div className="min-h-screen bg-[#05070A] text-slate-200 p-4">
                <button 
                    onClick={handleLeaveGame}
                    className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 transition-colors bg-slate-800 px-4 py-2 rounded-lg"
                >
                    <span>← Quitter l'Instance et retourner au Nexus</span>
                </button>
                
                {activeGameType === 'CrazyMorpion' && (
                    <CrazyMorpionClient socket={socket} roomId={joinedRoomId} username={username} />
                )}
                {activeGameType === 'KoOonTreeZ' && (
                    <KoOonTreeZClient socket={socket} roomId={joinedRoomId} username={username} />
                )}
                {activeGameType === 'AtomikKFardE' && (
                    <div className="p-8 text-center text-slate-400 border border-white/10 rounded-xl">
                        Composant AtomiK-K-Fard(e) en cours de construction...
                    </div>
                )}
            </div>
        );
    }

    // --- 4. VUE : LE LOBBY (NEXUS) ---
    return (
        <div className="min-h-screen bg-[#05070A] text-slate-200 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                
                <header className="mb-8 md:mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                        Le Nexus des Jeux
                    </h1>
                    <p className="text-slate-400 text-lg">Choisissez votre domaine, Oiseau <span className="font-bold text-white">{username}</span>.</p>
                </header>

                <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* --- COLONNE GAUCHE : FORGER L'INSTANCE --- */}
                    <div className="flex-[2] bg-slate-900/50 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">✦</span>
                            Ouvrir un Portail
                        </h2>

                        {/* Sélecteur de Jeu */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <button 
                                onClick={() => setSelectedGameToCreate('CrazyMorpion')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'CrazyMorpion' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-lg text-white mb-1">Crazy Morpion</h3>
                                <p className="text-xs text-slate-400">Le classique revisité avec des jokers.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('KoOonTreeZ')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'KoOonTreeZ' ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-lg text-white mb-1">KoÔonTreeZ</h3>
                                <p className="text-xs text-slate-400">Géo-quiz stratégique (Solo ou Multi).</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('AtomikKFardE')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'AtomikKFardE' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-lg text-white mb-1">AtomiK-K-Fard(E)</h3>
                                <p className="text-xs text-slate-400">Stratégie asymétrique profonde.</p>
                            </button>
                        </div>

                        {/* Formulaire Dynamique */}
                        <form onSubmit={handleCreateRoom} className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nom du salon (Optionnel)</label>
                                <input 
                                    type="text" 
                                    value={newRoomName}
                                    onChange={e => setNewRoomName(e.target.value)}
                                    placeholder={`Salon de ${username}`}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            {/* Options : KOOONTREEZ */}
                            {selectedGameToCreate === 'KoOonTreeZ' && (
                                <div className="space-y-4 mb-8 p-4 bg-slate-900/50 rounded-xl border border-green-500/20">
                                    <h4 className="font-bold text-green-400 mb-2">Paramètres de l'Expédition</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" value={ktMode} onChange={e => setKtMode(e.target.value)}>
                                            <option value="">-- Choisir un Mode --</option>
                                            <option value="DvsP">Drapeau vs Pays</option>
                                            <option value="DvsC">Drapeau vs Capitale</option>
                                            <option value="PvsC">Pays vs Capitale</option>
                                            <option value="PvsD">Pays vs Drapeau</option>
                                            <option value="CvsD">Capitale vs Drapeau</option>
                                            <option value="CvsP">Capitale vs Pays</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" value={ktNbPlayer} onChange={e => setKtNbPlayer(e.target.value)}>
                                            <option value="">-- Nombre de Joueurs --</option>
                                            <option value="solo">Solo</option>
                                            <option value="duo">Duo</option>
                                            <option value="trio">Trio</option>
                                            <option value="quad">Quad</option>
                                            <option value="battle-royale">Battle Royale</option>
                                        </select>

                                        {/* Option Solo uniquement si "solo" est sélectionné */}
                                        {ktNbPlayer === 'solo' && (
                                            <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 md:col-span-2" value={ktSoloMode} onChange={e => setKtSoloMode(e.target.value)}>
                                                <option value="">-- Mode Solo --</option>
                                                <option value="training">Entraînement</option>
                                                <option value="e-learning">E-Learning</option>
                                                <option value="challenge">Challenge</option>
                                            </select>
                                        )}

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" value={ktOption} onChange={e => setKtOption(e.target.value)}>
                                            <option value="">-- Objectif (Drapeaux) --</option>
                                            <option value="Blitzkrieg">Blitzkrieg (5)</option>
                                            <option value="Champ-De-Bataille">Champ de Bataille (10)</option>
                                            <option value="Sur-Le-Front">Sur Le Front (15)</option>
                                            <option value="Campagne">Campagne (20)</option>
                                            <option value="Guerre-Totale">Guerre Totale (30)</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" value={ktLevel} onChange={e => setKtLevel(e.target.value)}>
                                            <option value="">-- Difficulté --</option>
                                            <option value="easy">Facile</option>
                                            <option value="average">Moyen</option>
                                            <option value="normal">Normal</option>
                                            <option value="hard">Difficile</option>
                                            <option value="impossible">Impossible</option>
                                        </select>

                                    </div>
                                </div>
                            )}

                            {/* Options : ATOMIK-K-FARD(E) */}
                            {selectedGameToCreate === 'AtomikKFardE' && (
                                <div className="space-y-4 mb-8 p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                                    <h4 className="font-bold text-purple-400 mb-2">Paramètres Stratégiques</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akOption} onChange={e => setAkOption(e.target.value)}>
                                            <option value="">-- Choix du Héros --</option>
                                            <option value="Sonic">Sonic</option>
                                            <option value="Alex Kid">Alex Kid</option>
                                            <option value="Megaman">Megaman</option>
                                            <option value="Lara Croft">Lara Croft</option>
                                            <option value="Geralt De Riv">Geralt De Riv</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akMode} onChange={e => setAkMode(e.target.value)}>
                                            <option value="">-- Mode de Jeu --</option>
                                            <option value="stratege">Stratège</option>
                                            <option value="Random">Aléatoire (Random)</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akStyle} onChange={e => setAkStyle(e.target.value)}>
                                            <option value="">-- Style de Jeu --</option>
                                            <option value="classique">Classique</option>
                                            <option value="conquete">Conquête</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akNbPlayer} onChange={e => setAkNbPlayer(e.target.value)}>
                                            <option value="">-- Format d'Équipe --</option>
                                            <option value="duo">2 Joueurs (1v1)</option>
                                            <option value="2vs2">2 vs 2</option>
                                            <option value="3vs3">3 vs 3</option>
                                            <option value="4vs4">4 vs 4</option>
                                        </select>

                                        <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akTime} onChange={e => setAkTime(e.target.value)}>
                                            <option value="">-- Temps par Round --</option>
                                            <option value="15000">15 Secondes</option>
                                            <option value="30000">30 Secondes</option>
                                            <option value="45000">45 Secondes</option>
                                            <option value="60000">60 Secondes</option>
                                        </select>

                                        {(akNbPlayer === '2vs2' || akNbPlayer === '3vs3' || akNbPlayer === '4vs4') && (
                                            <select className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" value={akTeamMode} onChange={e => setAkTeamMode(e.target.value)}>
                                                <option value="">-- Mode d'Équipe --</option>
                                                <option value="defined">Défini (Choix libre)</option>
                                                <option value="random">Aléatoire</option>
                                                <option value="Blind">À l'aveugle (Blind)</option>
                                            </select>
                                        )}

                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02]">
                                Forger l'Instance
                            </button>
                        </form>
                    </div>

                    {/* --- COLONNE DROITE : RADAR DES SALONS --- */}
                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm flex flex-col h-[600px] xl:h-auto min-h-[600px]">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center text-green-400 animate-pulse">●</span>
                            Radar Spatial
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {activeRooms.length === 0 ? (
                                <div className="text-center text-slate-500 mt-20">
                                    <div className="text-4xl mb-4">🌌</div>
                                    <p>Le silence règne dans l'espace...</p>
                                    <p className="text-sm mt-2">Aucun salon n'est ouvert. Soyez le premier !</p>
                                </div>
                            ) : (
                                activeRooms.map(room => {
                                    
                                    // Déterminer la couleur de la carte selon le jeu
                                    let borderColor = 'border-white/5';
                                    let typeColor = 'text-slate-400';
                                    if (room.gameType === 'CrazyMorpion') { borderColor = 'hover:border-blue-500/50'; typeColor = 'text-blue-400'; }
                                    if (room.gameType === 'KoOonTreeZ') { borderColor = 'hover:border-green-500/50'; typeColor = 'text-green-400'; }
                                    //if (room.gameType === 'AtomikKFardE') { borderColor = 'hover:border-purple-500/50'; typeColor = 'text-purple-400'; }

                                    return (
                                        <div key={room.id} className={`bg-slate-800 rounded-xl p-4 border transition-colors group ${borderColor}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-white truncate max-w-[150px] md:max-w-[200px]" title={room.name}>{room.name}</h4>
                                                    <span className={`text-xs font-medium ${typeColor}`}>{room.gameType}</span>
                                                </div>
                                                <div className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400 whitespace-nowrap">
                                                    {room.players.length} / {room.maxPlayers} joueurs
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleJoinRoom(room.id)}
                                                disabled={room.players.length >= room.maxPlayers || room.state !== 'waiting'}
                                                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                                                    room.players.length >= room.maxPlayers || room.state !== 'waiting'
                                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                                }`}
                                            >
                                                {room.state === 'playing' ? 'Partie en cours' : (room.players.length >= room.maxPlayers ? 'Salon Plein' : 'Rejoindre l\'Instance')}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}