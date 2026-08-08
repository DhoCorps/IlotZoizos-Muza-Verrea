// apps/game-server/src/games/cinemax/CineMaxManager.ts
import { Server } from 'socket.io';
import { 
    CineMaxGameRoom,
    CineMaxRoomToSend, 
    CineMaxPlayer, 
    CineMaxGameOptions, 
    CineMaxMakeMoveRequest,
    CineMaxDifficulty
} from '@ilot/shared-core'; // Ton fichier de types partagés
import { CineMaxLogic } from '@ilot/shared-core'; // La logique métier

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

        // 1. Appel TMDB Unique par manche (L'astuce pour ne pas surcharger l'API)
        // TODO: Insérer ta clé API TMDB dans tes variables d'environnement
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
                p.pendingDifficultyChoice = true; // Le joueur doit choisir sa diff
            }
        });

        // 3. Gestion du Temps
        if (room.roundTimerInterval) clearInterval(room.roundTimerInterval);
        
        room.roundTimerInterval = setInterval(() => {
            room.currentRoundTimeLeft--;
            this.io.to(roomId).emit('cinemax:countdown', room.currentRoundTimeLeft);

            if (room.currentRoundTimeLeft <= 0) {
                this.endRound(roomId, null); // Temps écoulé, personne n'a buzzé
            }
        }, 1000);

        this.io.to(roomId).emit('game:update', this.toClientRoom(room));
        console.log(`[CineMaxManager] Moteur ! Action ! Round ${room.round} lancé pour le salon ${roomId}.`);
    }

    /**
     * 🎮 GESTION DES ACTIONS (Le cœur du gameplay)
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
     * 🎯 LOGIQUE : Le joueur choisit sa difficulté (Risk/Reward)
     */
    private processDifficultySelection(room: CineMaxGameRoom, player: CineMaxPlayer, difficulty: CineMaxDifficulty) {
        if (!player.pendingDifficultyChoice) return;

        // On génère une question adaptée depuis les données du film en cours
        // (Mockée ici, mais tu utiliseras le pool de données TMDB du round)
        const mockMovieData = { title: room.targetMovieTitle || "Unknown" }; 
        player.currentQuestion = this.generateQuestionFromPool(mockMovieData, difficulty);
        player.pendingDifficultyChoice = false;
        
        // On n'envoie l'update qu'au joueur concerné pour ne pas spammer tout le salon
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
            // 1. Gain de points persos
            const points = CineMaxLogic.getPointsForDifficulty(player.currentQuestion.difficulty);
            player.score += points;
            room.scores[player.id] = player.score;

            // 2. Éclaircissement de l'affiche pour TOUT LE MONDE (L'effort collectif)
            const blurReduction = CineMaxLogic.getBlurReductionForDifficulty(player.currentQuestion.difficulty);
            room.pelliculeBlur = Math.max(0, room.pelliculeBlur - blurReduction);

        } else {
            // Si faux, petit feedback. Pas de pénalité de points ici, la pénalité est sur le buzzer.
            this.io.to(player.socketId!).emit('error:message', "Mauvaise réponse. Cherche encore !");
        }

        // 3. Préparer la question suivante
        if (room.gameOptions.difficultyRule === 'PLAYER_CHOICE') {
            player.currentQuestion = null;
            player.pendingDifficultyChoice = true;
        } else {
            const nextDiff = CineMaxLogic.getRandomDifficulty();
            player.currentQuestion = this.generateQuestionFromPool({ title: room.targetMovieTitle || "" }, nextDiff);
        }

        // On met à jour l'image pour tout le monde !
        this.io.to(room.id).emit('game:update', this.toClientRoom(room));
    }

    /**
     * 🚨 LOGIQUE : Coup de Buzzer (La Tension !)
     */
    private processBuzzerHit(room: CineMaxGameRoom, player: CineMaxPlayer, guessedTitle: string) {
        if (player.isBuzzerLocked) {
            this.io.to(player.socketId!).emit('error:message', "Ton buzzer est en surchauffe, attends !");
            return;
        }

        const isCorrect = guessedTitle.toLowerCase().trim() === room.targetMovieTitle?.toLowerCase().trim();

        if (isCorrect) {
            // BINGO !
            room.buzzerWinnerId = player.id;
            player.score += 50; // Le gros lot
            room.scores[player.id] = player.score;
            room.pelliculeBlur = 0; // On révèle tout
            
            this.endRound(room.id, player.id);
        } else {
            // CATASTROPHE : Pénalité progressive !
            player.errorCount++;
            const penalty = CineMaxLogic.calculateBuzzerPenalty(player.errorCount);
            player.score -= penalty;
            room.scores[player.id] = player.score;

            // Verrouillage temporaire du buzzer
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
     * 🛑 FIN DU ROUND (et potentiellement FIN DU JEU)
     */
    private endRound(roomId: string, winnerId: string | null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }

        if (winnerId) {
            const winner = room.players.find(p => p.id === winnerId);
            console.log(`[CineMaxManager] Coupé ! ${winner?.username} a trouvé le film : ${room.targetMovieTitle}`);
        } else {
            console.log(`[CineMaxManager] Coupé ! Personne n'a trouvé le film : ${room.targetMovieTitle}`);
        }

        // =========================================================
        // 🏆 VÉRIFICATION DE FIN DE PARTIE (GAME OVER)
        // =========================================================
        // Dans Ciné-Max, la partie peut s'arrêter au bout de "maxRounds" ou quand un joueur atteint "scoreToWin"
        const maxScoreReched = room.players.some(p => p.score >= (room.gameOptions.scoreToWin || 500));
        const maxRoundsReached = room.gameOptions.maxRounds && room.round >= room.gameOptions.maxRounds;

        if (maxScoreReched || maxRoundsReached) {
            room.state = 'gameOver';
            
            // Déterminer le grand vainqueur de la partie
            let grandWinner = room.players[0];
            room.players.forEach(p => {
                if(p.score > grandWinner.score) grandWinner = p;
            });
            room.winnerId = grandWinner.id;

            console.log(`[CineMaxManager] FIN DE PARTIE dans le salon ${roomId}. Grand Vainqueur: ${grandWinner.username}`);

            // 💾 DÉCLENCHEMENT DE L'ARCHIVAGE (MONGO + NEO4J)
            const duration = (room.gameOptions.timePerRound || ROUND_DURATION_SECONDS) * room.round; 
            
            const matchData = {
                gameType: 'CineMax' as const,
                roomId: room.id,
                startedAt: new Date(Date.now() - (duration * 1000)), // Estimation simple
                endedAt: new Date(),
                durationSeconds: duration,
                players: room.players.map(p => {
                    return {
                        uid: p.id, 
                        pseudo: p.username,
                        score: p.score,
                        isWinner: p.id === room.winnerId,
                        specificStats: {
                            moviesGuessed: p.id === winnerId ? 1 : 0, // Exemple de stat spécifique
                            errorsMade: p.errorCount
                        }
                    };
                }),
                matchMetadata: {
                    difficultyRule: room.gameOptions.difficultyRule,
                    totalRoundsPlayed: room.round
                }
            };

            // Envoi en tâche de fond
            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[CineMaxManager] Historique sauvegardé avec succès pour le salon ${roomId}`);
            });

            // On signale aux clients que la partie entière est terminée
            this.io.to(room.id).emit('game:over', this.toClientRoom(room));

        } else {
            // Si la partie n'est pas finie, on passe à l'état 'waiting' (pause entre les films)
            room.state = 'waiting'; 
            
            // On envoie la mise à jour de fin de manche (pour afficher l'affiche nette, etc.)
            this.io.to(room.id).emit('game:round-end', this.toClientRoom(room));

            // Relancer le round suivant après 10 secondes
            // L'intervalle est créé ici pour assurer le flow automatique
            setTimeout(() => {
                const currentRoom = this.rooms.get(roomId);
                // On vérifie que la salle existe toujours et n'a pas été vidée pendant la pause
                if (currentRoom && currentRoom.players.length > 0) {
                    this.startRound(roomId);
                }
            }, 10000); 
        }
    }

    /**
     * 🛡️ SÉCURITÉ : Formate la Room pour ne pas envoyer les réponses au client
     */
    public toClientRoom(room: CineMaxGameRoom): CineMaxRoomToSend { // Idéalement de type CineMaxRoomToSend
        // On clone la room pour ne pas modifier l'originale
        const clientRoom = { ...room };
        
        // IMPORTANT : On cache le titre du film à deviner tant qu'il n'est pas trouvé
        if (room.pelliculeBlur > 0 && !room.buzzerWinnerId && room.state !== 'gameOver') {
            clientRoom.targetMovieTitle = null; 
        }

        // On masque la réponse correcte dans les questions actuelles des joueurs
        clientRoom.players = room.players.map(p => {
            const safePlayer = { ...p };
            if (safePlayer.currentQuestion) {
                // @ts-ignore - Masquage volontaire pour le client
                safePlayer.currentQuestion.correctAnswer = "HIDDEN";
            }
            return safePlayer;
        });

        return clientRoom;
    }

    /**
     * 🛠️ UTILITAIRE : Fabrique une question bidon pour le mock
     */
    private generateQuestionFromPool(movieData: any, difficulty: CineMaxDifficulty): any {
        // Logique complexe à implémenter : piocher dans les acteurs du film
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