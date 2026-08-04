// apps/hub-central/components/games/kooontreez/KoOonTreeZClient.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { 
    RoomToSend, 
    ChatMessage, 
    KoOonTreeZRoomToSend 
} from '@ilot/shared-core';
import { 
    QuizQuestion, 
    KoOonTreezMode 
} from '@ilot/shared-core';
import { KoOonTreezLogic } from '@ilot/shared-core';

interface KoOonTreeZClientProps {
    socket: Socket; // <-- Reçu depuis le hub central
    roomId: string;
    username: string;
    kooonTreezNbPlayer?: string;
    kooonTreezMode?: string;
    kooonTreezOption?: string;
    kooonTreezLevel?: string;
    kooonTreezSoloMode?: string;
}

export default function KoOonTreeZClient({ 
    socket, 
    roomId, 
    username 
}: KoOonTreeZClientProps) {
    const [gameState, setGameState] = useState<KoOonTreeZRoomToSend | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success'|'error'|'info' } | null>(null);
    const [hint, setHint] = useState<{ type: 'text'|'image', content: string } | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);

    // --- 1. ÉCOUTEURS SUR LE SOCKET REÇU EN PROP ---
    useEffect(() => {
        // Au montage du composant, on charge le cache des pays côté client pour les indices
        KoOonTreezLogic.fetchCountries();

        if (!socket) return;

        if (socket.connected) {
            console.log('[KoOonTreeZ] Connecté au serveur.');
            socket.emit('room:join', { roomId, username });
        }

        const handleConnect = () => {
            console.log('[KoOonTreeZ] Connecté au serveur.');
            socket.emit('room:join', { roomId, username });
        };

        const handleStateUpdate = (data: RoomToSend) => {
            if (data.gameType === 'KoOonTreeZ') {
                setGameState(data as KoOonTreeZRoomToSend);
                setErrorMsg(null);
            }
        };

        socket.on('connect', handleConnect);
        socket.on('room:joined', handleStateUpdate);
        socket.on('game:init', handleStateUpdate);
        socket.on('game:update', handleStateUpdate);
        
        socket.on('game:new-question', (data: QuizQuestion) => {
            setCurrentQuestion(data);
            setHasAnswered(false);
            setHint(null);
            setFeedback(null);
        });

        socket.on('kooontreez:countdown', (time: number) => {
            setTimeLeft(time);
        });

        socket.on('kooontreez:feedback', (fb: { playerId: string, isCorrect: boolean, message: string }) => {
            setFeedback({ message: fb.message, type: fb.isCorrect ? 'success' : 'error' });
            if (fb.playerId === socket.id) setHasAnswered(true);
        });

        socket.on('game:over', (data: RoomToSend) => {
            handleStateUpdate(data);
            setFeedback({ message: 'Partie terminée !', type: 'info' });
        });

        socket.on('game:restart', (data: RoomToSend) => {
            handleStateUpdate(data);
            setFeedback({ message: 'La partie a redémarré.', type: 'info' });
            setHint(null);
            setHasAnswered(false);
        });

        socket.on('chat:message', (msg: ChatMessage) => {
            setChatMessages(prev => [...prev, msg]);
        });

        socket.on('game:interrupted', (data: { message: string }) => {
            setErrorMsg(`Partie interrompue: ${data.message}`);
        });

        socket.on('error:message', (msg: string) => setErrorMsg(msg));

        return () => {
            socket.emit('room:leave', { roomId });
            socket.off('connect', handleConnect);
            socket.off('room:joined', handleStateUpdate);
            socket.off('game:init', handleStateUpdate);
            socket.off('game:update', handleStateUpdate);
            socket.off('game:new-question');
            socket.off('kooontreez:countdown');
            socket.off('kooontreez:feedback');
            socket.off('game:over');
            socket.off('game:restart');
            socket.off('chat:message');
            socket.off('game:interrupted');
            socket.off('error:message');
        };
    }, [socket, roomId, username]);

    // --- 2. ACTIONS JOUEUR ---
    const handleStartGame = () => socket?.emit('kooontreez:start-game', { roomId });
    const handleRestartGame = () => socket?.emit('game:restart-request', { roomId });
    
    const handleSendChat = (e: FormEvent) => {
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

    const submitAnswer = (answer: string) => {
        if (!socket || hasAnswered || gameState?.state !== 'playing') return;
        socket.emit('game:make-move', {
            roomId,
            playerId: socket.id,
            gameType: 'KoOonTreeZ',
            answer
        });
    };

    const showHint = () => {
        if (!currentQuestion || !gameState?.kooonTreezMode) return;
        const isQuestionText = !(currentQuestion.question.startsWith('http') && (currentQuestion.question.endsWith('.png') || currentQuestion.question.endsWith('.svg')));
        
        if (isQuestionText) {
            setHint({ type: 'image', content: currentQuestion.currentFlag.imageUrl });
        } else {
            const textHint = KoOonTreezLogic.getHint(currentQuestion.currentFlag, gameState.kooonTreezMode as KoOonTreezMode);
            setHint({ type: 'text', content: textHint });
        }
    };

    // --- 3. RENDU UI ---
    if (!gameState) return <div className="p-8 text-center text-slate-300">Embarquement pour KoÔonTreeZ...</div>;

    const isHost = gameState.players[0]?.id === socket?.id;
    const isQuestionImage = currentQuestion?.question.startsWith('http') && (currentQuestion.question.endsWith('.png') || currentQuestion.question.endsWith('.svg'));

    return (
        <div className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
            
            {/* PANNEAU PRINCIPAL : JEU */}
            <div className="flex-[2] bg-slate-900 rounded-xl p-6 border border-white/10 shadow-xl flex flex-col">
                
                {/* Header Info */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{gameState.name}</h2>
                        <p className="text-sm text-slate-400">Mode: {gameState.kooonTreezMode} | Niveau: {gameState.kooonTreezLevel}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-blue-400">{timeLeft}s</div>
                        <div className="text-sm text-slate-400">Drapeaux : {gameState.totalFlagsRecognized} / {gameState.targetFlagsCount === 'abandon' ? '∞' : gameState.targetFlagsCount}</div>
                    </div>
                </div>

                {errorMsg && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center">{errorMsg}</div>}
                {feedback && <div className={`mb-4 p-3 rounded-lg text-center font-bold ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : feedback.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{feedback.message}</div>}

                {/* État Attente */}
                {gameState.state === 'waiting' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="text-xl text-slate-300 animate-pulse">En attente de joueurs... ({gameState.players.filter(p => p.status === 'connected').length}/{gameState.maxPlayers})</div>
                        {isHost && gameState.kooonTreezNbPlayer !== 'solo' && gameState.players.length >= gameState.maxPlayers && (
                            <button onClick={handleStartGame} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                Lancer l'exploration
                            </button>
                        )}
                    </div>
                )}

                {/* État Terminé */}
                {gameState.state === 'gameOver' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
                        <h3 className="text-3xl font-black text-purple-400 mb-2">Exploration Terminée</h3>
                        <p className="text-lg text-slate-300">Vainqueur : {gameState.players.find(p => p.id === gameState.winnerId)?.username || 'Match nul / Abandon'}</p>
                        <button onClick={handleRestartGame} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all">
                            Relancer une expédition
                        </button>
                    </div>
                )}

                {/* État Jeu */}
                {gameState.state === 'playing' && currentQuestion && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        
                        {/* La Question */}
                        <div className="mb-8 w-full flex justify-center">
                            {isQuestionImage ? (
                                <img src={currentQuestion.question} alt="Drapeau à deviner" className="max-h-64 object-contain rounded-lg shadow-2xl border-4 border-slate-800" />
                            ) : (
                                <h3 className="text-4xl font-black text-center text-white">{currentQuestion.question}</h3>
                            )}
                        </div>

                        {/* Indice */}
                        <div className="mb-6 h-16 flex items-center justify-center">
                            {!hint ? (
                                <button onClick={showHint} className="text-sm text-yellow-500 hover:text-yellow-400 underline decoration-dotted underline-offset-4 transition-colors">
                                    Besoin d'un indice de la boussole ?
                                </button>
                            ) : hint.type === 'text' ? (
                                <div className="text-yellow-400 font-medium bg-yellow-500/10 px-4 py-2 rounded-lg">{hint.content}</div>
                            ) : (
                                <img src={hint.content} alt="Indice visuel" className="max-h-16 object-contain rounded border border-yellow-500/30" />
                            )}
                        </div>

                        {/* Les Options */}
                        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                            {currentQuestion.options.map((opt, idx) => {
                                const isOptionImage = opt.startsWith('http') && (opt.endsWith('.png') || opt.endsWith('.svg'));
                                return (
                                    <button 
                                        key={idx} 
                                        disabled={hasAnswered}
                                        onClick={() => submitAnswer(opt)}
                                        className={`p-4 rounded-xl font-bold transition-all shadow-lg min-h-[80px] flex items-center justify-center
                                            ${hasAnswered ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white border-white/10 hover:border-blue-500'}
                                        `}
                                    >
                                        {isOptionImage ? <img src={opt} alt="Option" className="max-h-12 object-contain" /> : opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* PANNEAU LATÉRAL : JOUEURS ET CHAT */}
            <div className="flex-1 flex flex-col gap-6">
                
                {/* Liste des joueurs */}
                <div className="bg-slate-900 rounded-xl border border-white/10 p-4 shadow-xl">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Explorateurs</h3>
                    <div className="space-y-2">
                        {gameState.players.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-white/5">
                                <span className={`font-medium ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                                    {p.username} {p.id === socket?.id && '(Moi)'}
                                </span>
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{p.score} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 bg-slate-900 rounded-xl border border-white/10 flex flex-col shadow-xl overflow-hidden min-h-[300px]">
                    <div className="p-3 border-b border-white/10 bg-slate-800/50 text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Radio de Camp
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatMessages.map(msg => {
                            const isMe = msg.senderId === socket?.id;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-slate-500 mb-1">{msg.senderUsername}</span>
                                    <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-slate-800/50 flex gap-2">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Message..." className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">Envoyer</button>
                    </form>
                </div>
            </div>

        </div>
    );
}