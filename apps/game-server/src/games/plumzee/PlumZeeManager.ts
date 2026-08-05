// apps/game-server/src/games/plumzee/PlumZeeManager.ts
import { Server } from 'socket.io';
import { 
    PlumZeeGameRoom, 
    PlumZeePlayer, 
    PlumZeeGameOptions, 
    PlumZeeMakeMoveRequest, 
    PlumZeeRoomToSend,
} from '@ilot/shared-core';
import { PlumZeeLogic } from '@ilot/shared-core';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE 
import { GameStatsService } from '@ilot/infrastructure';

export class PlumZeeManager {
    private io: Server;
    private rooms: Map<string, PlumZeeGameRoom>;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        this.rooms = new Map();
        console.log('[PlumZeeManager] Le boulier des dés cosmiques est en place. Prêt pour Plum\'Zee.');
    }

    public createRoom(
        roomId: string,
        roomName: string,
        ownerId: string,
        ownerUsername: string,
        ownerSocketId: string,
        options: PlumZeeGameOptions
    ): PlumZeeGameRoom {
        if (this.rooms.has(roomId)) {
            throw new Error(`Le salon Plum'Zee '${roomId}' existe déjà.`);
        }

        const ownerPlayer: PlumZeePlayer = {
            id: ownerId,
            socketId: ownerSocketId,
            username: ownerUsername,
            roomId,
            status: 'connected',
            isReady: false,
            scoreSheet: {},
            score: 0,
            totalScore: 0,
            rollsLeft: 3,
            hasFinished: false
        };

        const newRoom: PlumZeeGameRoom = {
            id: roomId,
            name: roomName,
            gameType: 'PlumZee',
            players: [ownerPlayer],
            state: 'waiting',
            winnerId: null,
            maxPlayers: 4,
            gameOptions: options,
            currentTurnPlayerId: ownerPlayer.id,
            currentRound: 1,
            round: 1,
            scores: { [ownerPlayer.id]: 0 },
            currentDice: PlumZeeLogic.rollInitialDice(),
            roundStartTime: Date.now()
        };

        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    public handlePlayerJoin(roomId: string, username: string, socketId: string): PlumZeeGameRoom | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        let player = room.players.find(p => p.username === username);
        if (player) {
            player.socketId = socketId;
            player.status = 'connected';
        } else {
            if (room.players.length >= room.maxPlayers) {
                throw new Error("Ce salon Plum'Zee est complet !");
            }
            player = {
                id: socketId,
                socketId,
                username,
                roomId,
                status: 'connected',
                isReady: false,
                scoreSheet: {},
                score: 0,
                totalScore: 0,
                rollsLeft: 3,
                hasFinished: false
            };
            room.players.push(player);
            room.scores[player.id] = 0;
        }

        if (room.state === 'waiting' && room.players.length >= 1) {
            room.state = 'playing';
        }

        return room;
    }

    public handleMakeMove(roomId: string, playerId: string, move: PlumZeeMakeMoveRequest): PlumZeeGameRoom {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'playing') throw new Error("Partie Plum'Zee inactive.");

        if (room.currentTurnPlayerId !== playerId) {
            throw new Error("Ce n'est pas votre tour de lancer les dés cosmiques !");
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) throw new Error("Joueur introuvable dans le salon.");

        if (move.action === 'TOGGLE_LOCK') {
            const { dieIndex } = move.payload;
            if (dieIndex === undefined || dieIndex < 0 || dieIndex >= room.currentDice.length) {
                throw new Error("Index de dé invalide.");
            }
            if (player.rollsLeft === 3) {
                throw new Error("Vous devez effectuer un premier lancer avant de verrouiller des dés !");
            }
            room.currentDice[dieIndex].isLocked = !room.currentDice[dieIndex].isLocked;
            return room;
        }

        if (move.action === 'ROLL_DICE') {
            if (player.rollsLeft <= 0) {
                throw new Error("Plus aucun lancer disponible pour ce tour ! Validez une case.");
            }

            if (player.rollsLeft === 3) {
                room.currentDice = PlumZeeLogic.rollInitialDice();
            } else {
                room.currentDice = PlumZeeLogic.rerollUnlockedDice(room.currentDice);
            }

            player.rollsLeft--;
            return room;
        }

        if (move.action === 'SCORE_COMBINATION') {
            const { combinationKey } = move.payload;
            if (!combinationKey) throw new Error("Combinaison non spécifiée.");

            if (player.rollsLeft === 3) {
                throw new Error("Vous devez lancer les dés au moins une fois avant de marquer un score !");
            }

            if (player.scoreSheet[combinationKey] !== undefined) {
                throw new Error("Cette combinaison a déjà été cochée sur votre parchemin !");
            }

            const earnedScore = PlumZeeLogic.calculateScore(combinationKey, room.currentDice);
            player.scoreSheet[combinationKey] = earnedScore;

            player.totalScore = Object.values(player.scoreSheet).reduce((acc: number, val) => acc + (val || 0), 0);
            player.score = player.totalScore;
            room.scores[player.id] = player.totalScore;

            player.rollsLeft = 3;
            room.currentDice = PlumZeeLogic.rollInitialDice();

            this.advanceTurnOrRound(room);

            return room;
        }

        return room;
    }

    public handleRestartRequest(roomId: string, playerId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.state = 'playing';
        room.winnerId = null;
        room.currentRound = 1;
        room.round = 1;
        room.currentDice = PlumZeeLogic.rollInitialDice();
        
        for (const p of room.players) {
            p.scoreSheet = {};
            p.score = 0;
            p.totalScore = 0;
            p.rollsLeft = 3;
            p.hasFinished = false;
            room.scores[p.id] = 0;
        }
        
        if (room.players.length > 0) {
            room.currentTurnPlayerId = room.players[0].id;
        }
    }

    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socketId || p.id === socketId);
        if (player) {
            player.status = 'disconnected';
        }
    }

    private advanceTurnOrRound(room: PlumZeeGameRoom): void {
        const connectedPlayers = room.players.filter(p => p.status === 'connected');
        if (connectedPlayers.length === 0) return;

        const currentIndex = connectedPlayers.findIndex(p => p.id === room.currentTurnPlayerId);
        const nextIndex = (currentIndex + 1) % connectedPlayers.length;

        if (nextIndex === 0) {
            room.currentRound++;
            room.round = room.currentRound;
        }

        room.currentTurnPlayerId = connectedPlayers[nextIndex].id;

        const maxRounds = room.gameOptions.maxRounds || 13;
        const allFinished = room.players.every(p => Object.keys(p.scoreSheet).length >= maxRounds);

        if (room.currentRound > maxRounds || allFinished) {
            room.state = 'gameOver';
            let highestScore = -1;
            let winner: PlumZeePlayer | null = null;
            for (const p of room.players) {
                if (p.totalScore > highestScore) {
                    highestScore = p.totalScore;
                    winner = p;
                }
            }
            if (winner) {
                room.winnerId = winner.id;
            }

            console.log(`[PlumZeeManager] FIN DE PARTIE dans le salon ${room.id}. Vainqueur : ${winner?.username || 'Aucun'}`);

            // =========================================================
            // 💾 DÉCLENCHEMENT DE L'ARCHIVAGE (MONGO + NEO4J)
            // =========================================================
            // On calcule la durée globale de la partie
            const durationInSeconds = room.roundStartTime ? Math.floor((Date.now() - room.roundStartTime) / 1000) : (maxRounds * 30);
            
            const matchData = {
                gameType: 'PlumZee' as const,
                roomId: room.id,
                startedAt: room.roundStartTime ? new Date(room.roundStartTime) : new Date(Date.now() - (durationInSeconds * 1000)), 
                endedAt: new Date(),
                durationSeconds: durationInSeconds,
                players: room.players.map(p => {
                    return {
                        uid: p.id, 
                        pseudo: p.username,
                        score: p.totalScore || 0,
                        isWinner: p.id === room.winnerId,
                        specificStats: {
                            // On peut archiver le parchemin final pour les statistiques détaillées
                            finalScoreSheet: JSON.stringify(p.scoreSheet),
                            totalRollsMade: Object.keys(p.scoreSheet).length * 3 // Approximation
                        }
                    };
                }),
                matchMetadata: {
                    totalRoundsPlayed: room.currentRound - 1, // Le dernier incrément dépasse la limite
                    maxRoundsSet: maxRounds
                }
            };

            // Envoi en tâche de fond
            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[PlumZeeManager] Historique sauvegardé avec succès pour le salon ${room.id}`);
            });
            // =========================================================
        }
    }

    public toClientRoom(room: PlumZeeGameRoom): PlumZeeRoomToSend {
        return {
            id: room.id,
            name: room.name,
            gameType: 'PlumZee',
            players: room.players.map(p => ({
                id: p.id,
                username: p.username,
                score: p.score,
                scores: room.scores,
                isReady: p.isReady,
                roomId: p.roomId,
                socketId: p.socketId,
                status: p.status,
                scoreSheet: p.scoreSheet,
                rollsLeft: p.rollsLeft,
                hasFinished: p.hasFinished
            })),
            state: room.state as any,
            winnerId: room.winnerId,
            round: room.currentRound,
            maxPlayers: room.maxPlayers,
            scores: room.scores,
            gameOptions: room.gameOptions,
            currentDice: room.currentDice,
            currentTurnPlayerId: room.currentTurnPlayerId,
            currentRound: room.currentRound
        };
    }

    public getRoom(roomId: string): PlumZeeGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public deleteRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }
}