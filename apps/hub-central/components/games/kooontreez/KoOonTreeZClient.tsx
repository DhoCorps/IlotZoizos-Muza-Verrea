// apps/hub-central/components/games/kooontreez/KoOonTreeZClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
    RoomToSend,  
    KoOonTreeZRoomToSend 
} from '@ilot/shared-core';
import { 
    KoOonTreezQuizQuestion, 
    KoOonTreezMode 
} from '@ilot/shared-core';
import { KoOonTreezLogic } from '@ilot/shared-core';
import { useGameSocket } from '@/components/games/providers/GameSocketProvider';

interface KoOonTreeZClientProps {
    roomId: string;
    username: string;
    kooonTreezNbPlayer?: string;
    kooonTreezMode?: string;
    kooonTreezOption?: string;
    kooonTreezLevel?: string;
    kooonTreezSoloMode?: string;
}

export default function KoOonTreeZClient({ 
    roomId, 
    username 
}: KoOonTreeZClientProps) {
    const { socket, isConnected } = useGameSocket();
    const [gameState, setGameState] = useState<KoOonTreeZRoomToSend | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<KoOonTreezQuizQuestion | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success'|'error'|'info' } | null>(null);
    const [hint, setHint] = useState<{ type: 'text'|'image', content: string } | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);

    useEffect(() => {
        KoOonTreezLogic.fetchCountries();

        if (!socket) return;

        // 1. Déclaration stricte des écouteurs
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

        const handleNewQuestion = (data: KoOonTreezQuizQuestion) => {
            setCurrentQuestion(data);
            setHasAnswered(false);
            setHint(null);
            setFeedback(null);
        };

        const handleCountdown = (time: number) => {
            setTimeLeft(time);
        };

        const handleFeedback = (fb: { playerId: string, isCorrect: boolean, message: string }) => {
            setFeedback({ message: fb.message, type: fb.isCorrect ? 'success' : 'error' });
            if (fb.playerId === socket.id) setHasAnswered(true);
        };

        const handleGameOver = (data: RoomToSend) => {
            handleStateUpdate(data);
            setFeedback({ message: 'Partie terminée !', type: 'info' });
        };

        const handleGameRestart = (data: RoomToSend) => {
            handleStateUpdate(data);
            setFeedback({ message: 'La partie a redémarré.', type: 'info' });
            setHint(null);
            setHasAnswered(false);
        };

        const handleInterrupted = (data: { message: string }) => {
            setErrorMsg(`Partie interrompue: ${data.message}`);
        };

        const handleErrorMessage = (msg: string) => {
            setErrorMsg(msg);
        };

        // 2. Attachement des écouteurs
        socket.on('connect', handleConnect);
        socket.on('room:joined', handleStateUpdate);
        socket.on('game:init', handleStateUpdate);
        socket.on('game:update', handleStateUpdate);
        socket.on('game:new-question', handleNewQuestion);
        socket.on('kooontreez:countdown', handleCountdown);
        socket.on('kooontreez:feedback', handleFeedback);
        socket.on('game:over', handleGameOver);
        socket.on('game:restart', handleGameRestart);
        socket.on('game:interrupted', handleInterrupted);
        socket.on('error:message', handleErrorMessage);

        if (socket.connected) {
            socket.emit('room:join', { roomId, username });
        }

        // 3. Nettoyage chirurgical (Mode Strict safe)
        return () => {
            socket.emit('room:leave', { roomId });
            socket.off('connect', handleConnect);
            socket.off('room:joined', handleStateUpdate);
            socket.off('game:init', handleStateUpdate);
            socket.off('game:update', handleStateUpdate);
            socket.off('game:new-question', handleNewQuestion);
            socket.off('kooontreez:countdown', handleCountdown);
            socket.off('kooontreez:feedback', handleFeedback);
            socket.off('game:over', handleGameOver);
            socket.off('game:restart', handleGameRestart);
            socket.off('game:interrupted', handleInterrupted);
            socket.off('error:message', handleErrorMessage);
        };
    }, [socket, roomId, username, isConnected]);

    const handleStartGame = () => socket?.emit('kooontreez:start-game', { roomId });
    const handleRestartGame = () => socket?.emit('game:restart-request', { roomId });

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

    if (!gameState) return <div className="p-8 text-center text-slate-300 font-mono">Embarquement pour KoÔonTreeZ...</div>;

    const isHost = gameState.players[0]?.id === socket?.id;
    const isQuestionImage = currentQuestion?.question.startsWith('http') && (currentQuestion.question.endsWith('.png') || currentQuestion.question.endsWith('.svg'));

    return (
        <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6">
            
            {/* PLATEAU PRINCIPAL DE L'EXPÉDITION */}
            <div className="w-full bg-slate-900 rounded-xl p-6 border border-white/10 shadow-xl flex flex-col">
                
                {/* Header Info */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{gameState.name}</h2>
                        <p className="text-sm text-slate-400">Mode: {gameState.kooonTreezMode} | Niveau: {gameState.kooonTreezLevel}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-blue-400 font-mono">{timeLeft}s</div>
                        <div className="text-sm text-slate-400 font-mono">Drapeaux : {gameState.totalFlagsRecognized} / {gameState.targetFlagsCount === 'abandon' ? '∞' : gameState.targetFlagsCount}</div>
                    </div>
                </div>

                {errorMsg && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center">{errorMsg}</div>}
                {feedback && <div className={`mb-4 p-3 rounded-lg text-center font-bold ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : feedback.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{feedback.message}</div>}

                {/* État Attente */}
                {gameState.state === 'waiting' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                        <div className="text-xl text-slate-300 animate-pulse font-mono">En attente de joueurs... ({gameState.players.filter(p => p.status === 'connected').length}/{gameState.maxPlayers})</div>
                        {isHost && gameState.kooonTreezNbPlayer !== 'solo' && gameState.players.length >= gameState.maxPlayers && (
                            <button onClick={handleStartGame} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                Lancer l'exploration
                            </button>
                        )}
                    </div>
                )}

                {/* État Terminé */}
                {gameState.state === 'gameOver' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center py-12">
                        <h3 className="text-3xl font-black text-purple-400 mb-2">Exploration Terminée</h3>
                        <p className="text-lg text-slate-300">Vainqueur : {gameState.players.find(p => p.id === gameState.winnerId)?.username || 'Match nul / Abandon'}</p>
                        <button onClick={handleRestartGame} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all">
                            Relancer une expédition
                        </button>
                    </div>
                )}

                {/* État Jeu */}
                {gameState.state === 'playing' && currentQuestion && (
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                        
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

            {/* LISTE DES JOUEURS */}
            <div className="w-full bg-slate-900 rounded-xl border border-white/10 p-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Explorateurs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {gameState.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-white/5">
                            <span className={`font-medium truncate ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                                {p.username} {p.id === socket?.id && '(Moi)'}
                            </span>
                            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full font-mono">{p.score} pts</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}