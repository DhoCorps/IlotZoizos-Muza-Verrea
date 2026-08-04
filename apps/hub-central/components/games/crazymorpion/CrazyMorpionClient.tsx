'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { 
    CrazyMorpionRoomToSend, 
    ChatMessage,
    CRAZYMORPION_SYMBOL_EMPTY
} from '@ilot/shared-core';

interface CrazyMorpionClientProps {
    socket: Socket;
    roomId: string;
    username: string;
}

export default function CrazyMorpionClient({ socket, roomId, username }: CrazyMorpionClientProps) {
    const [gameState, setGameState] = useState<CrazyMorpionRoomToSend | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        if (socket.connected) {
            socket.emit('room:join', { roomId, username });
        }

        const handleConnect = () => {
            console.log('[GAMES] Connecté au serveur. ID:', socket.id);
            socket.emit('room:join', { roomId, username });
        };

        const handleStateUpdate = (data: CrazyMorpionRoomToSend) => {
            if (data.gameType === 'CrazyMorpion') {
                setGameState(data);
                setErrorMsg(null);
            }
        };

        socket.on('connect', handleConnect);
        socket.on('room:joined', handleStateUpdate);
        socket.on('game:init', handleStateUpdate);
        socket.on('game:update', handleStateUpdate);
        socket.on('game:over', handleStateUpdate);
        socket.on('game:restart', handleStateUpdate);

        socket.on('chat:message', (msg: ChatMessage) => {
            setChatMessages(prev => [...prev, msg]);
        });

        socket.on('game:interrupted', (data: { message: string }) => {
            setErrorMsg(`Partie interrompue: ${data.message}`);
        });

        socket.on('error:message', (message: string) => {
            setErrorMsg(`Erreur: ${message}`);
        });

        socket.on('disconnect', () => {
            setErrorMsg('Déconnecté du serveur de jeu.');
        });

        return () => {
            socket.emit('room:leave', { roomId });
            socket.off('connect', handleConnect);
            socket.off('room:joined', handleStateUpdate);
            socket.off('game:init', handleStateUpdate);
            socket.off('game:update', handleStateUpdate);
            socket.off('game:over', handleStateUpdate);
            socket.off('game:restart', handleStateUpdate);
            socket.off('chat:message');
            socket.off('game:interrupted');
            socket.off('error:message');
            socket.off('disconnect');
        };
    }, [socket, roomId, username]);

    const handleCellClick = (x: number, y: number) => {
        if (!socket || !gameState || gameState.state !== 'playing') return;
        if (gameState.currentTurnPlayerId !== socket.id) return;
        
        if (gameState.grid![y][x] !== CRAZYMORPION_SYMBOL_EMPTY) return; 

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

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!socket || !chatInput.trim()) return;

        socket.emit('chat:send-message', {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            senderUsername: username,
            senderId: socket.id,
            text: chatInput.trim(),
            roomId,
            timestamp: Date.now()
        });
        setChatInput('');
    };

    if (!gameState) {
        return <div className="p-8 text-center text-slate-300 font-mono">Initialisation du plateau...</div>;
    }

    const isMyTurn = gameState.currentTurnPlayerId === socket?.id;
    const me = gameState.players.find(p => p.id === socket?.id);
    const opponent = gameState.players.find(p => p.id !== socket?.id);

    return (
        <div className="max-w-4xl mx-auto p-4 flex flex-col md:flex-row gap-6">
            
            {/* COLONNE GAUCHE : LE JEU */}
            <div className="flex-1 bg-slate-900 rounded-xl p-6 border border-white/10 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold text-white">{gameState.name}</h2>
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300 font-mono">
                        Manche {gameState.round}
                    </span>
                </div>

                {/* Score Board */}
                <div className="flex justify-between mb-8 text-lg font-medium">
                    <div className="text-blue-400">
                        {me?.username} ({me?.symbol || '?'}) : {me?.score || 0}
                    </div>
                    <div className="text-red-400">
                        {opponent?.username || 'En attente...'} ({opponent?.symbol || '?'}) : {opponent?.score || 0}
                    </div>
                </div>

                {/* Messages d'état */}
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center border border-red-500/30">
                        {errorMsg}
                    </div>
                )}
                
                {gameState.state === 'waiting' && (
                    <div className="mb-4 p-3 bg-blue-500/20 text-blue-400 rounded-lg text-center border border-blue-500/30 animate-pulse">
                        En attente d'un adversaire...
                    </div>
                )}

                {gameState.state === 'playing' && (
                    <div className={`mb-6 p-3 rounded-lg text-center font-bold border transition-colors ${
                        isMyTurn ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-white/5'
                    }`}>
                        {isMyTurn ? "C'est votre tour d'agir !" : "L'adversaire réfléchit..."}
                    </div>
                )}

                {gameState.state === 'gameOver' && (
                    <div className="mb-6 p-4 bg-purple-500/20 text-purple-300 rounded-lg text-center border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-2">Partie Terminée</h3>
                        <p>{gameState.winnerId === socket?.id ? "Vous avez gagné !" : (gameState.winnerId ? "Vous avez perdu." : "Match nul !")}</p>
                        <button 
                            onClick={handleRestart}
                            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-bold"
                        >
                            Rejouer
                        </button>
                    </div>
                )}

                {/* LA GRILLE */}
                <div className="flex justify-center mb-8">
                    <div className="grid grid-cols-3 gap-2 bg-slate-800 p-2 rounded-lg border border-white/10">
                        {gameState.grid!.map((row, y) => (
                            row.map((symbol, x) => {
                                const isWinningCell = gameState.winningCells?.some(c => c.x === x && c.y === y);
                                const isClickable = gameState.state === 'playing' && isMyTurn && symbol === CRAZYMORPION_SYMBOL_EMPTY;

                                return (
                                    <div 
                                        key={`${y}-${x}`}
                                        onClick={() => handleCellClick(x, y)}
                                        className={`
                                            w-24 h-24 flex items-center justify-center text-4xl font-black rounded
                                            transition-all duration-200 select-none
                                            ${isClickable ? 'cursor-pointer bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 cursor-not-allowed'}
                                            ${isWinningCell ? 'bg-green-500/30 animate-pulse text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-slate-300'}
                                        `}
                                    >
                                        {symbol}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>
            </div>

            {/* COLONNE DROITE : LE CHAT */}
            <div className="w-full md:w-80 bg-slate-900 rounded-xl border border-white/10 flex flex-col shadow-xl overflow-hidden h-[600px]">
                <div className="p-4 border-b border-white/10 bg-slate-800/50 font-bold text-white">
                    Fréquence de l'Îlot
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map(msg => {
                        const isMe = msg.senderId === socket?.id;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-slate-500 mb-1">{msg.senderUsername}</span>
                                <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                                    isMe ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-slate-800/50 flex gap-2">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Transmettre..."
                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm transition-colors font-bold">
                        Envoyer
                    </button>
                </form>
            </div>
        </div>
    );
}