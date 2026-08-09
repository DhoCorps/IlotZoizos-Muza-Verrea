// apps/hub-central/components/games/GameNexus.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoomToSend } from '@ilot/shared-core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface GameNexusProps {
    username: string;
    locale?: string;
}

type GameTypeSelection = 'CrazyMorpion' | 'KoOonTreeZ' | 'WikiOracle' | 'AtomikKFardE' | 'SoonArt' | 'PlumZee' | 'GalakTK' | 'CineMax';

export default function GameNexus({ username, locale = 'fr' }: GameNexusProps) {
    // 🛡️ Utilisation du hook global (la connexion persiste pendant la navigation)
    const { socket, isConnected } = useGameSocket();
    const router = useRouter();
    
    const [activeRooms, setActiveRooms] = useState<RoomToSend[]>([]);
    const [selectedGameToCreate, setSelectedGameToCreate] = useState<GameTypeSelection>('CrazyMorpion');
    const [newRoomName, setNewRoomName] = useState('');

    // Options KoOonTreeZ
    const [ktMode, setKtMode] = useState('');
    const [ktNbPlayer, setKtNbPlayer] = useState('');
    const [ktOption, setKtOption] = useState('');
    const [ktLevel, setKtLevel] = useState('');
    const [ktSoloMode, setKtSoloMode] = useState('');

    // Fonction de redirection par URL
    const redirectToGame = useCallback((roomId: string, gameType: string) => {
        const gamePathMap: Record<string, string> = {
            'CrazyMorpion': 'crazymorpion',
            'KoOonTreeZ': 'kooontreez',
            'WikiOracle': 'wikioracle',
            'SoonArt': 'soonart',
            'PlumZee': 'plumzee',
            'GalakTK': 'galaktk',
            'AtomikKFardE': 'atomikkfarde',
            'CineMax': 'cinemax'
        };
        const folder = gamePathMap[gameType] || gameType.toLowerCase();
        router.push(`/${locale}/games/${folder}/${roomId}`);
    }, [locale, router]);

    // --- 1. ÉCOUTEURS D'ÉVÉNEMENTS MÉTIER ---
    useEffect(() => {
        if (!socket) return;

        const onRoomList = (rooms: RoomToSend[]) => setActiveRooms(rooms);
        
        // Quand le serveur confirme notre création de salon, on redirige vers l'URL dédiée
        const onRoomJoined = (roomData: RoomToSend) => {
            redirectToGame(roomData.id, roomData.gameType);
        };
        const onGameInit = (roomData: RoomToSend) => {
            redirectToGame(roomData.id, roomData.gameType);
        };
        const onErrorMsg = (msg: string) => toast.error(`Erreur de la Matrice : ${msg}`);

        socket.on('room:list', onRoomList);
        socket.on('room:joined', onRoomJoined); // Pour le créateur de la room
        socket.on('game:init', onGameInit);
        socket.on('error:message', onErrorMsg);

        // Au montage, on demande la liste fraîche des salons
        if (isConnected) {
            socket.emit('room:get-all');
        }

        return () => {
            socket.off('room:list', onRoomList);
            socket.off('room:joined', onRoomJoined);
            socket.off('game:init', onGameInit);
            socket.off('error:message', onErrorMsg);
        };
    }, [socket, isConnected, redirectToGame]);

    // --- 2. ACTIONS DU LOBBY ---
    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !isConnected) {
            toast.error("La connexion à la matrice est instable. Veuillez patienter.");
            return;
        }

        const payload: any = {
            username,
            roomName: newRoomName || `Salon de ${username}`,
            gameType: selectedGameToCreate,
        };

        if (selectedGameToCreate === 'KoOonTreeZ') {
            if (ktNbPlayer) payload.kooonTreezNbPlayer = ktNbPlayer;
            if (ktMode) payload.kooonTreezMode = ktMode;
            if (ktOption) payload.kooonTreezOption = ktOption;
            if (ktLevel) payload.kooonTreezLevel = ktLevel;
            if (ktSoloMode && ktNbPlayer === 'solo') payload.kooonTreezSoloMode = ktSoloMode;
        }

        socket.emit('room:create', payload);
    };

    const handleJoinRoom = (roomId: string, gameType: string) => {
        if (!isConnected) return;
        // La redirection vers l'URL du jeu suffira. Le composant client de la page 
        // ciblée se chargera d'émettre le 'room:join' au montage.
        redirectToGame(roomId, gameType);
    };

    // --- 3. VUE : LE LOBBY (NEXUS) ---
    return (
        <div className="min-h-screen bg-[#05070A] text-slate-200 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                
                <header className="mb-8 md:mb-12 text-center relative">
                    <div className="absolute right-0 top-0 hidden md:block">
                        <Link 
                            href={`/${locale}/games/leaderboard`}
                            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-bold transition-all flex items-center gap-2 shadow-lg"
                        >
                            <span>🏆</span>
                            <span>Hall of Fame</span>
                        </Link>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-500 mb-2 flex items-center justify-center gap-4">
                        Le Nexus des Jeux
                        {!isConnected && <span className="text-red-500 text-sm font-mono animate-pulse">(Déconnecté)</span>}
                    </h1>
                    <p className="text-slate-400 text-lg">Choisissez votre domaine, Oiseau <span className="font-bold text-white">{username}</span>.</p>

                    <div className="mt-4 md:hidden flex justify-center">
                        <Link 
                            href={`/${locale}/games/leaderboard`}
                            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-bold flex items-center gap-2"
                        >
                            <span>🏆</span>
                            <span>Hall of Fame</span>
                        </Link>
                    </div>
                </header>

                <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* --- COLONNE GAUCHE : FORGER L'INSTANCE --- */}
                    <div className="flex-[2] bg-slate-900/50 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">✦</span>
                            Ouvrir un Portail
                        </h2>

                        {/* Sélecteur de Jeu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <button 
                                onClick={() => setSelectedGameToCreate('CrazyMorpion')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'CrazyMorpion' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">Crazy Morpion</h3>
                                <p className="text-xs text-slate-400">Classique revisité.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('KoOonTreeZ')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'KoOonTreeZ' ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">KoÔonTreeZ</h3>
                                <p className="text-xs text-slate-400">Géo-quiz & Atlas.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('WikiOracle')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'WikiOracle' ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">WikiOracle</h3>
                                <p className="text-xs text-slate-400">Quiz sémantique.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('AtomikKFardE')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'AtomikKFardE' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">AtomiK-K-Fard(e)</h3>
                                <p className="text-xs text-slate-400">Stratégie profonde.</p>
                            </button>
                            
                            {/* Nouveaux Jeux intégrés au Nexus */}
                            <button 
                                onClick={() => setSelectedGameToCreate('SoonArt')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'SoonArt' ? 'border-rose-500 bg-rose-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">Soon'Art</h3>
                                <p className="text-xs text-slate-400">Trésors & Dessin.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('PlumZee')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'PlumZee' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">Plum'Zee</h3>
                                <p className="text-xs text-slate-400">Yam's Cosmique.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('GalakTK')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'GalakTK' ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">Galak-T-K</h3>
                                <p className="text-xs text-slate-400">Démineur Spatial.</p>
                            </button>

                            <button 
                                onClick={() => setSelectedGameToCreate('CineMax')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGameToCreate === 'CineMax' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                            >
                                <h3 className="font-bold text-base text-white mb-1">CinéMax</h3>
                                <p className="text-xs text-slate-400">Quiz Cinéma.</p>
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

                            {/* Options spécifiques : KOOONTREEZ */}
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
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={!isConnected}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Forger l'Instance
                            </button>
                        </form>
                    </div>

                    {/* --- COLONNE DROITE : RADAR DES SALONS --- */}
                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm flex flex-col h-[600px] xl:h-auto min-h-[600px]">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                            <span className={`w-8 h-8 rounded flex items-center justify-center ${isConnected ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>●</span>
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
                                    // Codes couleurs dynamiques par jeu
                                    let borderColor = 'border-white/5';
                                    let typeColor = 'text-slate-400';
                                    
                                    if (room.gameType === 'CrazyMorpion') { borderColor = 'hover:border-blue-500/50'; typeColor = 'text-blue-400'; }
                                    else if (room.gameType === 'KoOonTreeZ') { borderColor = 'hover:border-green-500/50'; typeColor = 'text-green-400'; }
                                    else if (room.gameType === 'WikiOracle') { borderColor = 'hover:border-amber-500/50'; typeColor = 'text-amber-400'; }
                                    else if (room.gameType === 'AtomikKFardE') { borderColor = 'hover:border-purple-500/50'; typeColor = 'text-purple-400'; }
                                    else if (room.gameType === 'SoonArt') { borderColor = 'hover:border-rose-500/50'; typeColor = 'text-rose-400'; }
                                    else if (room.gameType === 'PlumZee') { borderColor = 'hover:border-yellow-500/50'; typeColor = 'text-yellow-400'; }
                                    else if (room.gameType === 'GalakTK') { borderColor = 'hover:border-cyan-500/50'; typeColor = 'text-cyan-400'; }
                                    else if (room.gameType === 'CineMax') { borderColor = 'hover:border-emerald-500/50'; typeColor = 'text-emerald-400'; }

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
                                                onClick={() => handleJoinRoom(room.id, room.gameType)}
                                                disabled={room.players.length >= room.maxPlayers || room.state !== 'waiting' || !isConnected}
                                                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                                                    room.players.length >= room.maxPlayers || room.state !== 'waiting' || !isConnected
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