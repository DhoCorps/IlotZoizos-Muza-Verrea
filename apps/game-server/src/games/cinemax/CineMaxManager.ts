// apps/game-server/src/games/cinemax/CineMaxManager.ts
import { Server } from 'socket.io';
import { 
    CineMaxGameRoom,
    CineMaxRoomToSend, 
    CineMaxPlayer, 
    CineMaxGameOptions, 
    CineMaxMakeMoveRequest,
    CineMaxDifficulty
} from '@ilot/shared-core'; 
import { CineMaxLogic } from '@ilot/shared-core'; 

// 💾 IMPORT DU SERVICE D'ARCHIVAGE 
import { GameStatsService } from '@ilot/infrastructure';

const ROUND_DURATION_SECONDS = 120; // 2 minutes par film
const BUZZER_LOCK_DURATION_MS = 10000; // 10 secondes de blocage après une erreur

export class CineMaxManager {
    private io: Server;
    private rooms: Map<string, CineMaxGameRoom>;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        this.rooms = new Map();
        console.log('[CineMaxManager] Le projecteur est allumé. Prêt à diffuser.');
    }

    /**
     * 🎬 CRÉATION DU SALON
     */
    public createRoom(
        roomId: string,
        roomName: string,
        ownerId: string,
        ownerUsername: string,
        ownerSocketId: string,
        options: CineMaxGameOptions
    ): CineMaxGameRoom {
        if (this.rooms.has(roomId)) {
            throw new Error(`Le salon '${roomId}' est déjà en cours de projection.`);
        }

        const ownerPlayer: CineMaxPlayer = {
            id: ownerId,
            username: ownerUsername,
            socketId: ownerSocketId,
            roomId: roomId,
            status: 'connected',
            isReady: false,
            score: 0,
            gameType: 'CineMax',
            errorCount: 0,
            isBuzzerLocked: false,
            currentQuestion: null,
            pendingDifficultyChoice: options.difficultyRule === 'PLAYER_CHOICE'
        };

        const maxPlayers = this.getMaxPlayers(options.nbPlayer);

        const newRoom: CineMaxGameRoom = {
            id: roomId,
            name: roomName,
            players: [ownerPlayer],
            state: 'waitingForPlayers',
            winnerId: null,
            round: 0,
            gameType: 'CineMax',
            maxPlayers: maxPlayers,
            scores: { [ownerPlayer.id]: 0 },
            gameOptions: options,
            
            // L'Obscurité de la Salle
            targetMovieId: null,
            targetMovieTitle: null,
            targetMoviePoster: null,
            pelliculeBlur: 100, // On commence dans le noir complet
            
            roundTimerInterval: null,
            currentRoundTimeLeft: options.timePerRound || ROUND_DURATION_SECONDS,
            buzzerWinnerId: null
        };

        this.rooms.set(roomId, newRoom);
        console.log(`[CineMaxManager] Salon '${roomName}' créé par ${ownerUsername}.`);
        return newRoom;
    }

    /**
     * 🚪 REJOINDRE LE SALON
     */
    public handlePlayerJoin(roomId: string, username: string, socketId: string): CineMaxGameRoom | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        let player = room.players.find(p => p.username === username);

        if (player) {
            // Reconnexion
            player.socketId = socketId;
            player.status = 'connected';
            console.log(`[CineMaxManager] ${username} a retrouvé son siège.`);
        } else {
            // Nouveau spectateur
            if (room.players.length >= room.maxPlayers) {
                throw new Error("La salle de cinéma est pleine !");
            }
            player = {
                id: socketId,
                socketId: socketId,
                username: username,
                roomId: roomId,
                status: 'connected',
                isReady: false,
                score: 0,
                gameType: 'CineMax',
                errorCount: 0,
                isBuzzerLocked: false,
                currentQuestion: null,
                pendingDifficultyChoice: room.gameOptions.difficultyRule === 'PLAYER_CHOICE'
            };
            room.players.push(player);
            room.scores[player.id] = 0;
        }

        // Si la salle est pleine, on lance le film !
        if (room.state === 'waitingForPlayers' && room.players.length === room.maxPlayers) {
            this.startRound(roomId);
        }

        return room;
    }

    /**
     * 🔌 GESTION DE LA DÉCONNEXION D'UN JOUEUR
     */
    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socketId || p.id === socketId);
        if (player) {
            player.status = 'disconnected';
            console.log(`[CineMaxManager] Le joueur ${player.username} s'est éclipsé de la salle.`);
        }
    }

    /**
     * 🔍 RÉCUPÉRATION DU SALON
     */
    public getRoom(roomId: string): CineMaxGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * 🗑️ SUPPRESSION DU SALON
     */
    public deleteRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room && room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
        }
        this.rooms.delete(roomId);
        console.log(`[CineMaxManager] Salon '${roomId}' fermé et projecteur éteint.`);
    }

    /**
     * 🎞️ DÉMARRAGE DU ROUND (Le projecteur tourne)
     */
    private async startRound(roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.state = 'inGame';
        room.round++;
        room.pelliculeBlur = 100; // Reset du flou
        room.buzzerWinnerId = null;
        room.currentRoundTimeLeft = room.gameOptions.timePerRound || ROUND_DURATION_SECONDS;

        // 1. Appel TMDB Unique par manche
        const movieData = await CineMaxLogic.fetchRoundDataFromTMDB("TA_CLE_API");
        
        room.targetMovieId = movieData.targetMovieId;
        room.targetMovieTitle = movieData.title;
        room.targetMoviePoster = movieData.posterPath;

        // 2. Génération des premières questions pour les joueurs
        room.players.forEach(p => {
            p.errorCount = 0;
            p.isBuzzerLocked = false;
            
            if (room.gameOptions.difficultyRule === 'SERVER_CHAOS') {
                const diff = CineMaxLogic.getRandomDifficulty();
                p.currentQuestion = this.generateQuestionFromPool(movieData, diff);
                p.pendingDifficultyChoice = false;
            } else {
                p.currentQuestion = null;
                p.pendingDifficultyChoice = true; 
            }
        });

        // 3. Gestion du Temps
        if (room.roundTimerInterval) clearInterval(room.roundTimerInterval);
        
        room.roundTimerInterval = setInterval(() => {
            room.currentRoundTimeLeft--;
            this.io.to(roomId).emit('cinemax:countdown', room.currentRoundTimeLeft);

            if (room.currentRoundTimeLeft <= 0) {
                this.endRound(roomId, null); 
            }
        }, 1000);

        this.io.to(roomId).emit('game:update', this.toClientRoom(room));
        console.log(`[CineMaxManager] Moteur ! Action ! Round ${room.round} lancé pour le salon ${roomId}.`);
    }

    /**
     * 🎮 GESTION DES ACTIONS
     */
    public handleMakeMove(roomId: string, playerId: string, move: CineMaxMakeMoveRequest): void {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'inGame') return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        switch (move.action) {
            case 'SELECT_DIFFICULTY':
                this.processDifficultySelection(room, player, move.payload?.difficulty!);
                break;
            case 'SOLVE_QUESTION':
                this.processQuestionSolving(room, player, move.payload?.answer!);
                break;
            case 'HIT_BUZZER':
                this.processBuzzerHit(room, player, move.payload?.movieTitle!);
                break;
        }
    }

    /**
     * 🎯 LOGIQUE : Le joueur choisit sa difficulté
     */
    private processDifficultySelection(room: CineMaxGameRoom, player: CineMaxPlayer, difficulty: CineMaxDifficulty) {
        if (!player.pendingDifficultyChoice) return;

        const mockMovieData = { title: room.targetMovieTitle || "Unknown" }; 
        player.currentQuestion = this.generateQuestionFromPool(mockMovieData, difficulty);
        player.pendingDifficultyChoice = false;
        
        this.io.to(player.socketId!).emit('cinemax:personal-update', { 
            currentQuestion: player.currentQuestion,
            pendingDifficultyChoice: false
        });
    }

    /**
     * 🧩 LOGIQUE : Le joueur répond à sa propre question
     */
    private processQuestionSolving(room: CineMaxGameRoom, player: CineMaxPlayer, answer: string) {
        if (!player.currentQuestion) return;

        const isCorrect = answer.toLowerCase().trim() === player.currentQuestion.correctAnswer.toLowerCase().trim();

        if (isCorrect) {
            const points = CineMaxLogic.getPointsForDifficulty(player.currentQuestion.difficulty);
            player.score += points;
            room.scores[player.id] = player.score;

            const blurReduction = CineMaxLogic.getBlurReductionForDifficulty(player.currentQuestion.difficulty);
            room.pelliculeBlur = Math.max(0, room.pelliculeBlur - blurReduction);

        } else {
            this.io.to(player.socketId!).emit('error:message', "Mauvaise réponse. Cherche encore !");
        }

        if (room.gameOptions.difficultyRule === 'PLAYER_CHOICE') {
            player.currentQuestion = null;
            player.pendingDifficultyChoice = true;
        } else {
            const nextDiff = CineMaxLogic.getRandomDifficulty();
            player.currentQuestion = this.generateQuestionFromPool({ title: room.targetMovieTitle || "" }, nextDiff);
        }

        this.io.to(room.id).emit('game:update', this.toClientRoom(room));
    }

    /**
     * 🚨 LOGIQUE : Coup de Buzzer
     */
    private processBuzzerHit(room: CineMaxGameRoom, player: CineMaxPlayer, guessedTitle: string) {
        if (player.isBuzzerLocked) {
            this.io.to(player.socketId!).emit('error:message', "Ton buzzer est en surchauffe, attends !");
            return;
        }

        const isCorrect = guessedTitle.toLowerCase().trim() === room.targetMovieTitle?.toLowerCase().trim();

        if (isCorrect) {
            room.buzzerWinnerId = player.id;
            player.score += 50; 
            room.scores[player.id] = player.score;
            room.pelliculeBlur = 0; 
            
            this.endRound(room.id, player.id);
        } else {
            player.errorCount++;
            const penalty = CineMaxLogic.calculateBuzzerPenalty(player.errorCount);
            player.score -= penalty;
            room.scores[player.id] = player.score;

            player.isBuzzerLocked = true;
            setTimeout(() => {
                const currentRoom = this.rooms.get(room.id);
                const p = currentRoom?.players.find(x => x.id === player.id);
                if (p) {
                    p.isBuzzerLocked = false;
                    this.io.to(p.socketId!).emit('cinemax:buzzer-unlocked');
                }
            }, BUZZER_LOCK_DURATION_MS);

            this.io.to(room.id).emit('game:update', this.toClientRoom(room));
        }
    }

    /**
     * 🛑 FIN DU ROUND
     */
    private endRound(roomId: string, winnerId: string | null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }

        const maxScoreReched = room.players.some(p => p.score >= (room.gameOptions.scoreToWin || 500));
        const maxRoundsReached = room.gameOptions.maxRounds && room.round >= room.gameOptions.maxRounds;

        if (maxScoreReched || maxRoundsReached) {
            room.state = 'gameOver';
            
            let grandWinner = room.players[0];
            room.players.forEach(p => {
                if(p.score > grandWinner.score) grandWinner = p;
            });
            room.winnerId = grandWinner.id;

            const duration = (room.gameOptions.timePerRound || ROUND_DURATION_SECONDS) * room.round; 
            
            const matchData = {
                gameType: 'CineMax' as const,
                roomId: room.id,
                startedAt: new Date(Date.now() - (duration * 1000)),
                endedAt: new Date(),
                durationSeconds: duration,
                players: room.players.map(p => ({
                    uid: p.id, 
                    pseudo: p.username,
                    score: p.score,
                    isWinner: p.id === room.winnerId,
                    specificStats: {
                        moviesGuessed: p.id === winnerId ? 1 : 0,
                        errorsMade: p.errorCount
                    }
                })),
                matchMetadata: {
                    difficultyRule: room.gameOptions.difficultyRule,
                    totalRoundsPlayed: room.round
                }
            };

            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[CineMaxManager] Historique sauvegardé avec succès pour le salon ${roomId}`);
            });

            this.io.to(room.id).emit('game:over', this.toClientRoom(room));

        } else {
            room.state = 'waiting'; 
            this.io.to(room.id).emit('game:round-end', this.toClientRoom(room));

            setTimeout(() => {
                const currentRoom = this.rooms.get(roomId);
                if (currentRoom && currentRoom.players.length > 0) {
                    this.startRound(roomId);
                }
            }, 10000); 
        }
    }

    /**
     * 🛡️ SÉCURITÉ : Formate la Room pour le client
     */
    public toClientRoom(room: CineMaxGameRoom): CineMaxRoomToSend {
        const clientRoom = { ...room };
        
        if (room.pelliculeBlur > 0 && !room.buzzerWinnerId && room.state !== 'gameOver') {
            clientRoom.targetMovieTitle = null; 
        }

        clientRoom.players = room.players.map(p => {
            const safePlayer = { ...p };
            if (safePlayer.currentQuestion) {
                // @ts-ignore
                safePlayer.currentQuestion.correctAnswer = "HIDDEN";
            }
            return safePlayer;
        });

        return clientRoom;
    }

    private generateQuestionFromPool(movieData: any, difficulty: CineMaxDifficulty): any {
        return {
            id: Date.now().toString(),
            type: 'ACTOR_FACE',
            difficulty: difficulty,
            questionText: "Qui est cet acteur/actrice ?",
            options: difficulty === 'TEXT' ? [] : ["Acteur A", "Acteur B", "Brad Pitt", "Acteur C"].slice(0, difficulty as number),
            correctAnswer: "Brad Pitt"
        };
    }

    private getMaxPlayers(nbPlayerSetting: string): number {
        switch (nbPlayerSetting) {
            case 'solo': return 1;
            case 'trio': return 3;
            case 'quad': return 4;
            case 'duo': default: return 2;
        }
    }
}