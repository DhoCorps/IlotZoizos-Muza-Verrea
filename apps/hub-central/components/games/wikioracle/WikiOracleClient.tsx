// apps/hub-central/components/games/wikioracle/WikiOracleClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomToSend } from '@ilot/shared-core';
import { WikiOracleRoomToSend, WikiQuizQuestion } from '@ilot/shared-core';

interface WikiOracleClientProps {
    socket: Socket;
    roomId: string;
    username: string;
}

export default function WikiOracleClient({ socket, roomId, username }: WikiOracleClientProps) {
    const [gameState, setGameState] = useState<WikiOracleRoomToSend | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<WikiQuizQuestion | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [currentHint, setCurrentHint] = useState<string>('');
    const [answerInput, setAnswerInput] = useState<string>('');
    const [hasAnswered, setHasAnswered] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        if (socket.connected) {
            socket.emit('room:join', { roomId, username });
        }

        const handleStateUpdate = (data: RoomToSend) => {
            if (data.gameType === 'WikiOracle') {
                setGameState(data as WikiOracleRoomToSend);
                setErrorMsg(null);
            }
        };

        socket.on('room:updated', handleStateUpdate);
        socket.on('game:state-update', handleStateUpdate);

        socket.on('wikioracle:new-question', (data: { round: number; questionTitle: string; options: string[]; initialHint: string; imageUrl?: string }) => {
            setCurrentQuestion({
                questionTitle: data.questionTitle,
                correctAnswer: '',
                options: data.options || [],
                hints: [data.initialHint],
                imageUrl: data.imageUrl
            });
            setCurrentHint(data.initialHint);
            setHasAnswered(false);
            setFeedback(null);
            setAnswerInput('');
        });

        socket.on('wikioracle:countdown', (time: number) => {
            setTimeLeft(time);
        });

        socket.on('wikioracle:new-hint', (data: { hintLevel: number; hintText: string }) => {
            setCurrentHint(data.hintText);
        });

        socket.on('wikioracle:feedback', (fb: { playerId: string; isCorrect: boolean; message: string }) => {
            setFeedback({ message: fb.message, type: fb.isCorrect ? 'success' : 'error' });
            if (fb.playerId === socket.id) setHasAnswered(true);
        });

        socket.on('game:over', (data: RoomToSend) => {
            handleStateUpdate(data);
            setFeedback({ message: 'Oracle de l’Encyclopédie atteint ! Fin de la partie.', type: 'info' });
        });

        socket.on('error:message', (msg: string) => setErrorMsg(msg));

        return () => {
            socket.emit('room:leave', { roomId });
            socket.off('room:updated', handleStateUpdate);
            socket.off('game:state-update', handleStateUpdate);
            socket.off('wikioracle:new-question');
            socket.off('wikioracle:countdown');
            socket.off('wikioracle:new-hint');
            socket.off('wikioracle:feedback');
            socket.off('game:over');
            socket.off('error:message');
        };
    }, [socket, roomId, username]);

    const handleStartGame = () => {
        socket?.emit('wikioracle:start-game', { roomId });
    };

    const submitAnswer = (answer: string) => {
        if (!socket || hasAnswered || gameState?.state !== 'playing') return;
        socket.emit('game:make-move', {
            roomId,
            playerId: socket.id,
            gameType: 'WikiOracle',
            answer
        });
    };

    if (!gameState) return <div className="p-8 text-center text-slate-300 font-mono">Connexion à l'Oracle...</div>;

    const isHost = gameState.players[0]?.id === socket?.id;
    const isZeroChoiceMode = !gameState.choicesMode || gameState.choicesMode === '0';

    return (
        <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6">
            <div className="w-full bg-slate-900 rounded-xl p-6 border border-white/10 shadow-xl flex flex-col">
                
                {/* Header Infos */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span>🔮</span> {gameState.name}
                        </h2>
                        <p className="text-sm text-slate-400">Thème : <span className="uppercase text-cyan-400 font-bold">{gameState.theme || 'Aléatoire'}</span> | Tour : {gameState.round}/5</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-cyan-400 font-mono">{timeLeft}s</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Temps Restant</div>
                    </div>
                </div>

                {errorMsg && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-center">{errorMsg}</div>}
                {feedback && <div className={`mb-4 p-3 rounded-lg text-center font-bold ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : feedback.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{feedback.message}</div>}

                {/* État Attente */}
                {gameState.state === 'waiting' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                        <div className="text-xl text-slate-300 animate-pulse font-mono">En attente d'explorateurs de savoirs...</div>
                        {isHost && (
                            <button onClick={handleStartGame} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                Consulter l'Oracle
                            </button>
                        )}
                    </div>
                )}

                {/* État Terminé */}
                {gameState.state === 'gameOver' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center py-12">
                        <h3 className="text-3xl font-black text-amber-400 mb-2">Fin de la Consultation</h3>
                        <p className="text-lg text-slate-300">L'Oracle a rendu son verdict. Consultez les scores finaux ci-dessous !</p>
                    </div>
                )}

                {/* État Jeu */}
                {gameState.state === 'playing' && currentQuestion && (
                    <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-6">
                        
                        {/* Visuel optionnel de l'article */}
                        {currentQuestion.imageUrl && (
                            <img src={currentQuestion.imageUrl} alt="Illustration Wikipédia" className="max-h-48 object-contain rounded-xl shadow-lg border border-white/10 mb-2" />
                        )}

                        <h3 className="text-xl font-bold text-center text-white">{currentQuestion.questionTitle}</h3>

                        {/* Boîte d'indices progressifs */}
                        <div className="w-full max-w-2xl bg-cyan-950/40 border border-cyan-500/30 p-4 rounded-xl shadow-inner">
                            <span className="text-xs uppercase font-mono text-cyan-400 tracking-wider block mb-1">Indice de l'Oracle :</span>
                            <p className="text-cyan-200 font-medium text-lg">{currentHint}</p>
                        </div>

                        {/* Options QCM ou Saisie Libre */}
                        {isZeroChoiceMode ? (
                            <div className="flex gap-3 w-full max-w-xl">
                                <input 
                                    type="text" 
                                    disabled={hasAnswered}
                                    value={answerInput}
                                    onChange={(e) => setAnswerInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer(answerInput)}
                                    placeholder="Entrez le titre exact de l'article..."
                                    className="flex-1 bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 font-medium"
                                />
                                <button 
                                    disabled={hasAnswered || !answerInput.trim()}
                                    onClick={() => submitAnswer(answerInput)}
                                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all"
                                >
                                    Proposer
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                                {currentQuestion.options.map((opt, idx) => (
                                    <button 
                                        key={idx} 
                                        disabled={hasAnswered}
                                        onClick={() => submitAnswer(opt)}
                                        className={`p-4 rounded-xl font-bold transition-all shadow-lg min-h-[60px] flex items-center justify-center text-center
                                            ${hasAnswered ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white border-white/10 hover:border-cyan-500'}
                                        `}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tableau des Scores des Explorateurs */}
            <div className="w-full bg-slate-900 rounded-xl border border-white/10 p-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Bibliothécaires & Explorateurs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {gameState.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-white/5">
                            <span className={`font-medium truncate ${p.status === 'connected' ? 'text-white' : 'text-slate-500 line-through'}`}>
                                {p.username} {p.id === socket?.id && '(Moi)'}
                            </span>
                            <span className="bg-cyan-600 text-white text-xs font-bold px-2.5 py-1 rounded-full font-mono">{p.score} pts</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}