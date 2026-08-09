// apps/hub-central/components/games/crazymorpion/CrazyMorpionClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
    CrazyMorpionRoomToSend, 
    CRAZYMORPION_SYMBOL_EMPTY
} from '@ilot/shared-core';
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface CrazyMorpionClientProps {
    roomId: string;
    username: string;
}

export default function CrazyMorpionClient({ roomId, username }: CrazyMorpionClientProps) {
    const { socket, isConnected } = useGameSocket();
    const [gameState, setGameState] = useState<CrazyMorpionRoomToSend | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        // 1. Définition stricte des écouteurs pour pouvoir les retirer individuellement
        const handleConnect = () => {
            console.log('[CRAZY MORPION] Connecté/Reconnecté au serveur.');
            socket.emit('room:join', { roomId, username });
        };

        const handleStateUpdate = (data: CrazyMorpionRoomToSend) => {
            if (data.gameType === 'CrazyMorpion') {
                setGameState(data);
                setErrorMsg(null);
            }
        };

        const handleInterrupted = (data: { message: string }) => {
            setErrorMsg(`Partie interrompue: ${data.message}`);
        };

        const handleErrorMessage = (message: string) => {
            setErrorMsg(`Erreur: ${message}`);
        };

        const handleDisconnect = () => {
            setErrorMsg('Déconnecté du serveur de jeu.');
        };

        // 2. Attachement des écouteurs
        socket.on('connect', handleConnect);
        socket.on('room:joined', handleStateUpdate);
        socket.on('game:init', handleStateUpdate);
        socket.on('game:update', handleStateUpdate);
        socket.on('game:over', handleStateUpdate);
        socket.on('game:restart', handleStateUpdate);
        socket.on('game:interrupted', handleInterrupted);
        socket.on('error:message', handleErrorMessage);
        socket.on('disconnect', handleDisconnect);

        // Si le socket est déjà connecté au montage, on rejoint directement
        if (socket.connected) {
            socket.emit('room:join', { roomId, username });
        }

        // 3. Nettoyage chirurgical
        return () => {
            socket.emit('room:leave', { roomId });
            
            // On retire UNIQUEMENT les écouteurs de ce composant pour ne pas casser le Nexus global
            socket.off('connect', handleConnect);
            socket.off('room:joined', handleStateUpdate);
            socket.off('game:init', handleStateUpdate);
            socket.off('game:update', handleStateUpdate);
            socket.off('game:over', handleStateUpdate);
            socket.off('game:restart', handleStateUpdate);
            socket.off('game:interrupted', handleInterrupted);
            socket.off('error:message', handleErrorMessage);
            socket.off('disconnect', handleDisconnect);
        };
    }, [socket, roomId, username, isConnected]);

    const handleCellClick = (x: number, y: number) => {
        if (!socket || !gameState || gameState.state !== 'playing') return;
        if (gameState.currentTurnPlayerId !== socket.id) return;
        
        // Sécurité supplémentaire : on vérifie que la grille existe
        if (!gameState.grid || gameState.grid[y][x] !== CRAZYMORPION_SYMBOL_EMPTY) return; 

        socket.emit('game:make-move', {
            roomId,
            playerId: socket.id,
            x,
            y,
            gameType: 'CrazyMorpion'
        });
    };

    const handleRestart = () => {
        if (socket) socket.emit('game:restart-request', { roomId });
    };

    if (!gameState) {
        return <div className="p-8 text-center text-slate-300 font-mono">Initialisation du plateau...</div>;
    }

    const isMyTurn = gameState.currentTurnPlayerId === socket?.id;
    const me = gameState.players.find(p => p.id === socket?.id);
    const opponent = gameState.players.find(p => p.id !== socket?.id);

    return (
        <div className="max-w-2xl w-full mx-auto p-4 flex flex-col gap-6">
            
            {/* LE PLATEAU DE JEU CENTRÉ */}
            <div className="flex-1 bg-slate-900 rounded-xl p-8 border border-white/10 shadow-xl flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold text-white">{gameState.name}</h2>
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300 font-mono">
                        Manche {gameState.round}
                    </span>
                </div>

                {/* Score Board */}
                <div className="w-full flex justify-around mb-8 text-lg font-medium">
                    <div className="text-blue-400">
                        {me?.username} ({me?.symbol || '?'}) : {me?.score || 0}
                    </div>
                    <div className="text-red-400">
                        {opponent?.username || 'En attente...'} ({opponent?.symbol || '?'}) : {opponent?.score || 0}
                    </div>
                </div>

                {/* Messages d'état */}
                {errorMsg && (
                    <div className="w-full mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center border border-red-500/30">
                        {errorMsg}
                    </div>
                )}
                
                {gameState.state === 'waiting' && (
                    <div className="w-full mb-4 p-3 bg-blue-500/20 text-blue-400 rounded-lg text-center border border-blue-500/30 animate-pulse">
                        En attente d'un adversaire...
                    </div>
                )}

                {gameState.state === 'playing' && (
                    <div className={`w-full mb-6 p-3 rounded-lg text-center font-bold border transition-colors ${
                        isMyTurn ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-white/5'
                    }`}>
                        {isMyTurn ? "C'est votre tour d'agir !" : "L'adversaire réfléchit..."}
                    </div>
                )}

                {gameState.state === 'gameOver' && (
                    <div className="w-full mb-6 p-4 bg-purple-500/20 text-purple-300 rounded-lg text-center border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-2">Partie Terminée</h3>
                        <p>{gameState.winnerId === socket?.id ? "Vous avez gagné !" : (gameState.winnerId ? "Vous avez perdu." : "Match nul !")}</p>
                        <button 
                            onClick={handleRestart}
                            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-bold shadow-lg"
                        >
                            Rejouer
                        </button>
                    </div>
                )}

                {/* LA GRILLE */}
                <div className="flex justify-center mb-4">
                    <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3 rounded-xl border border-white/10 shadow-inner">
                        {gameState.grid?.map((row, y) => (
                            row.map((symbol, x) => {
                                const isWinningCell = gameState.winningCells?.some(c => c.x === x && c.y === y);
                                const isClickable = gameState.state === 'playing' && isMyTurn && symbol === CRAZYMORPION_SYMBOL_EMPTY;

                                return (
                                    <div 
                                        key={`${y}-${x}`}
                                        onClick={() => handleCellClick(x, y)}
                                        className={`
                                            w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-5xl font-black rounded-lg
                                            transition-all duration-200 select-none
                                            ${isClickable ? 'cursor-pointer bg-slate-700 hover:bg-slate-600 hover:scale-[1.02]' : 'bg-slate-900 cursor-not-allowed'}
                                            ${isWinningCell ? 'bg-green-500/30 animate-pulse text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'text-slate-300'}
                                        `}
                                    >
                                        {symbol !== CRAZYMORPION_SYMBOL_EMPTY ? symbol : ''}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}