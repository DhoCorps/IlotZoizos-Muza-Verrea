import { Server } from 'socket.io';
import { RoomToSend } from '@ilot/shared-core';
import {
    WikiOraclePlayer,
    WikiOracleChoicesMode,
    WikiOracleTheme,
    WikiOracleGameRoom as ManagerInternalWikiOracleGameRoom
} from '@ilot/shared-core';
import { WikiOracleLogic } from '@ilot/shared-core';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE ET DE L'ORCHESTRATEUR DE PARIS
import { GameStatsService } from '@ilot/infrastructure';
import { BettingOrchestrator } from '@ilot/shared-core';

const wikiOracleRooms: Map<string, ManagerInternalWikiOracleGameRoom> = new Map();
const ROUND_DURATION_SECONDS = 30; // 30 secondes par manche

export class WikiOracleManager {
    private io: Server;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        console.log('[WikiOracleManager] Initialisé.');
    }

    public createRoom(
        roomId: string, roomName: string, creatorPlayer: WikiOraclePlayer, options: {
            choicesMode?: WikiOracleChoicesMode;
            theme?: WikiOracleTheme;
            wagerAmount?: number;
            wagerCurrency?: string;
            gameMode?: string;
            difficulty?: string;
        }
    ): ManagerInternalWikiOracleGameRoom {
        const choicesMode = options.choicesMode || '4';
        const theme = options.theme || 'random';

        const newRoom: ManagerInternalWikiOracleGameRoom = {
            id: roomId,
            name: roomName,
            players: [creatorPlayer],
            state: 'waiting',
            winnerId: null,
            round: 0,
            gameType: 'WikiOracle',
            maxPlayers: 8,
            scores: { [creatorPlayer.id]: 0 },
            choicesMode,
            theme,
            currentRoundTimeLeft: ROUND_DURATION_SECONDS,
            roundTimerInterval: null,
            hintRevealInterval: null,
            currentQuestion: null,
            currentHintLevel: 0,
            playersAnsweredThisRound: new Set<string>(),
            correctAnswerGivenThisRound: false,
            // 🌟 SÉQUESTRE NATIF
            wagerAmount: options.wagerAmount || 0,
            wagerCurrency: options.wagerCurrency || 'DHO',
        };

        wikiOracleRooms.set(roomId, newRoom);
        this.io.emit('room:list', Array.from(wikiOracleRooms.values()).map(this.roomToRoomToSend));
        return newRoom;
    }

    public handlePlayerJoin(roomId: string, username: string, newSocketId: string) {
        const room = wikiOracleRooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.username === username);
        if (player) {
            player.id = newSocketId;
            player.socketId = newSocketId;
            player.status = 'connected';
        } else {
            const newPlayer: WikiOraclePlayer = {
                id: newSocketId,
                socketId: newSocketId,
                username,
                score: 0,
                roomId,
                status: 'connected',
                isReady: false,
                currentHintLevel: 0
            };
            room.players.push(newPlayer);
            room.scores[newPlayer.id] = 0;
        }

        this.io.to(roomId).emit('game:state-update', this.roomToRoomToSend(room));
    }

    public async startGame(roomId: string): Promise<void> {
        const room = wikiOracleRooms.get(roomId);
        if (!room || room.state === 'playing') return;

        room.state = 'playing';
        room.round = 0;
        room.players.forEach(p => room.scores[p.id] = 0);

        await this.startRound(roomId);
    }

    private async startRound(roomId: string): Promise<void> {
        const room = wikiOracleRooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        room.round++;
        room.currentRoundTimeLeft = ROUND_DURATION_SECONDS;
        room.currentHintLevel = 0;
        room.playersAnsweredThisRound.clear();
        room.correctAnswerGivenThisRound = false;

        const question = await WikiOracleLogic.getQuizQuestion(room.theme, room.choicesMode);
        if (!question) {
            this.io.to(roomId).emit('error:message', 'Échec de la consultation de l’Oracle Wikipédia.');
            return;
        }

        room.currentQuestion = question;

        if (room.roundTimerInterval) clearInterval(room.roundTimerInterval);
        room.roundTimerInterval = setInterval(() => {
            room.currentRoundTimeLeft--;
            this.io.to(roomId).emit('wikioracle:countdown', room.currentRoundTimeLeft);

            if (room.currentRoundTimeLeft === 20 || room.currentRoundTimeLeft === 10) {
                if (room.currentHintLevel < question.hints.length - 1) {
                    room.currentHintLevel++;
                    this.io.to(roomId).emit('wikioracle:new-hint', {
                        hintLevel: room.currentHintLevel,
                        hintText: question.hints[room.currentHintLevel]
                    });
                }
            }

            if (room.currentRoundTimeLeft <= 0) {
                this.endRound(roomId);
            }
        }, 1000);

        this.io.to(roomId).emit('wikioracle:new-question', {
            round: room.round,
            questionTitle: question.questionTitle,
            options: question.options,
            initialHint: question.hints[0],
            imageUrl: question.imageUrl
        });

        this.io.emit('room:list', Array.from(wikiOracleRooms.values()).map(this.roomToRoomToSend));
    }

    private async endRound(roomId: string): Promise<void> {
        const room = wikiOracleRooms.get(roomId);
        if (!room) return;

        if (room.roundTimerInterval) clearInterval(room.roundTimerInterval);

        if (room.round >= 5) {
            room.state = 'gameOver';
            
            // Détermination du vainqueur
            let highestScore = -1;
            let winner: WikiOraclePlayer | null = null;
            for (const p of room.players) {
                const score = room.scores[p.id] || 0;
                if (score > highestScore) {
                    highestScore = score;
                    winner = p;
                }
            }
            if (winner) {
                room.winnerId = winner.id;
            }

            // =========================================================
            // 🌟 SUTURE ÉCONOMIQUE KONTRAKT : Résolution des crédits/paris
            // =========================================================
            try {
                const wagerAmt = room.wagerAmount || 0;
                const wagerCur = room.wagerCurrency || 'DHO';
                const difficultyVal = room.choicesMode || '4';
                const modeVal = room.theme || 'random';

                if (wagerAmt > 0 && room.winnerId) {
                    for (const p of room.players) {
                        const isWinner = p.id === room.winnerId;
                        await BettingOrchestrator.resolveGameAndCalculateCredit(
                            p.id,
                            'WikiOracle',
                            modeVal,
                            difficultyVal,
                            wagerCur,
                            wagerAmt,
                            isWinner
                        );
                    }
                }
            } catch (econErr) {
                console.error(`[WikiOracleManager] Erreur KonTraKt pour la salle ${roomId}:`, econErr);
            }
            // =========================================================

            // 💾 ARCHIVAGE
            GameStatsService.recordMatch({
                gameType: 'WikiOracle',
                roomId: room.id,
                startedAt: new Date(Date.now() - 150000),
                endedAt: new Date(),
                durationSeconds: 150,
                players: room.players.map(p => ({
                    uid: p.id,
                    pseudo: p.username,
                    score: room.scores[p.id] || 0,
                    isWinner: p.id === room.winnerId,
                    specificStats: { roundsPlayed: room.round }
                })),
                matchMetadata: { theme: room.theme }
            });

            this.io.to(roomId).emit('game:over', this.roomToRoomToSend(room));
        } else {
            setTimeout(() => this.startRound(roomId), 3000);
        }
    }

    public handleSubmitAnswer(roomId: string, playerId: string, answer: string): void {
        const room = wikiOracleRooms.get(roomId);
        if (!room || room.state !== 'playing' || !room.currentQuestion) return;

        if (room.playersAnsweredThisRound.has(playerId)) return;
        room.playersAnsweredThisRound.add(playerId);

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        const isCorrect = answer.toLowerCase().trim() === room.currentQuestion.correctAnswer.toLowerCase().trim();
        let pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = Math.max(2, 10 - (room.currentHintLevel * 3) - Math.floor((ROUND_DURATION_SECONDS - room.currentRoundTimeLeft) / 5));
            room.scores[playerId] = (room.scores[playerId] || 0) + pointsEarned;
            player.score = room.scores[playerId];

            this.io.to(roomId).emit('wikioracle:feedback', {
                playerId,
                isCorrect: true,
                message: `${player.username} a trouvé la réponse exacte : "${room.currentQuestion.correctAnswer}" ! (+${pointsEarned} pts)`
            });
            room.correctAnswerGivenThisRound = true;
        } else {
            this.io.to(roomId).emit('wikioracle:feedback', {
                playerId,
                isCorrect: false,
                message: `${player.username} a proposé "${answer}" (Incorrect).`
            });
        }

        this.io.to(roomId).emit('game:state-update', this.roomToRoomToSend(room));

        const connectedPlayersCount = room.players.filter(p => p.status === 'connected').length;
        if (room.playersAnsweredThisRound.size >= connectedPlayersCount) {
            this.endRound(roomId);
        }
    }

    public getRoom(roomId: string) { return wikiOracleRooms.get(roomId); }
    public deleteRoom(roomId: string) { wikiOracleRooms.delete(roomId); }
    public notifyPlayerDisconnect(socketId: string, roomId: string) {
        const room = wikiOracleRooms.get(roomId);
        if (!room) return;
        const p = room.players.find(x => x.id === socketId);
        if (p) p.status = 'disconnected';
    }

    private roomToRoomToSend = (room: ManagerInternalWikiOracleGameRoom): RoomToSend => {
        return {
            id: room.id,
            name: room.name,
            gameType: room.gameType,
            scores: room.scores || {},
            players: room.players.map(p => ({ ...p })),
            state: room.state,
            winnerId: room.winnerId,
            round: room.round,
            maxPlayers: room.maxPlayers,
            currentRoundTimeLeft: room.currentRoundTimeLeft,
            wagerAmount: room.wagerAmount,
            wagerCurrency: room.wagerCurrency
        } as RoomToSend;
    }
}