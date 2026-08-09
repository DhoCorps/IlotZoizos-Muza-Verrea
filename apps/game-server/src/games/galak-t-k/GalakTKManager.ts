// apps/game-server/src/games/galaktk/GalakTKManager.ts
import { Server } from 'socket.io';
import { 
    GalakTKGameRoom, 
    GalakTKPlayer, 
    GalakTKGameOptions, 
    GalakTKMakeMoveRequest, 
    GalakTKMoveResult,
    GalakTKRoomToSend
} from '@ilot/shared-core';
import { GalakTKLogic } from '@ilot/shared-core';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE 
import { GameStatsService } from '@ilot/infrastructure';

export class GalakTKManager {
    private io: Server;
    private rooms: Map<string, GalakTKGameRoom>;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        this.rooms = new Map();
        console.log('[GalakTKManager] La grille stellaire est initialisée. Prêt pour la déduction.');
    }

    public createRoom(
        roomId: string,
        roomName: string,
        ownerId: string,
        ownerUsername: string,
        ownerSocketId: string,
        options: GalakTKGameOptions
    ): GalakTKGameRoom {
        if (this.rooms.has(roomId)) {
            throw new Error(`Le secteur '${roomId}' est déjà ouvert.`);
        }

        const ownerPlayer: GalakTKPlayer = {
            id: ownerId,
            socketId: ownerSocketId,
            username: ownerUsername,
            roomId,
            status: 'connected',
            isReady: false,
            score: 0,
            starsFoundCount: 0,
            turnsTaken: 0,
            startTime: Date.now(),
            totalTimeMs: 0,
            markedCells: [],
            foundStarPositions: []
        };

        const stars = GalakTKLogic.generateRandomStars(options);

        const newRoom: GalakTKGameRoom = {
            id: roomId,
            name: roomName,
            gameType: 'GalakTK',
            players: [ownerPlayer],
            state: 'waiting',
            winnerId: null,
            maxPlayers: 4,
            gameOptions: options,
            stars,
            currentTurnPlayerId: ownerPlayer.id,
            roundStartTime: Date.now(),
            round: 0,
            scores: { [ownerPlayer.id]: 0 }
        };

        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    public handlePlayerJoin(roomId: string, username: string, socketId: string): GalakTKGameRoom | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        let player = room.players.find(p => p.username === username);
        if (player) {
            player.socketId = socketId;
            player.status = 'connected';
        } else {
            if (room.players.length >= room.maxPlayers) {
                throw new Error("Le secteur stellaire est complet !");
            }
            player = {
                id: socketId,
                socketId,
                username,
                roomId,
                status: 'connected',
                isReady: false,
                score: 0,
                starsFoundCount: 0,
                turnsTaken: 0,
                startTime: Date.now(),
                totalTimeMs: 0,
                markedCells: [],
                foundStarPositions: []
            };
            room.players.push(player);
            if (!room.scores) {
                room.scores = {};
            }
            room.scores[player.id] = 0;
        }

        if (room.state === 'waiting' && room.players.length >= 2) {
            room.state = 'playing';
        }

        return room;
    }

    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socketId || p.id === socketId);
        if (player) {
            player.status = 'disconnected';
            console.log(`[GalakTKManager] Le pilote ${player.username} a quitté le secteur.`);
        }
    }

    public handleMakeMove(roomId: string, playerId: string, move: GalakTKMakeMoveRequest): { room: GalakTKGameRoom, moveResult?: GalakTKMoveResult } {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'playing') throw new Error("Partie inactive.");
        if (room.currentTurnPlayerId !== playerId) throw new Error("Ce n'est pas votre tour !");

        const player = room.players.find(p => p.id === playerId);
        if (!player) throw new Error("Joueur introuvable.");

        if (move.action === 'MARK_CELL') {
            const { position, markStatus } = move.payload;
            if (!position || !markStatus) throw new Error("Données de marquage invalides.");

            const existingIndex = player.markedCells.findIndex(m => m.x === position.x && m.y === position.y);
            if (existingIndex >= 0) player.markedCells[existingIndex].status = markStatus;
            else player.markedCells.push({ x: position.x, y: position.y, status: markStatus });

            return { room };
        } 
        
        if (move.action === 'CLICK_CELL') {
            const { position } = move.payload;
            if (!position) throw new Error("Position invalide.");

            player.turnsTaken++;
            if (player.foundStarPositions.some(s => s.x === position.x && s.y === position.y)) {
                throw new Error("Vous avez déjà découvert cette étoile !");
            }

            const result = GalakTKLogic.countStarsOnAxes(position, room.stars, room.gameOptions);

            if (result.isStar) {
                player.foundStarPositions.push(position);
                player.starsFoundCount++;

                if (player.starsFoundCount >= room.stars.length) {
                    room.state = 'gameOver';
                    room.winnerId = player.id;
                    const durationInSeconds = Math.floor((Date.now() - room.roundStartTime) / 1000);
                    
                    GameStatsService.recordMatch({
                        gameType: 'GalakTK',
                        roomId: room.id,
                        startedAt: new Date(room.roundStartTime),
                        endedAt: new Date(),
                        durationSeconds: durationInSeconds,
                        players: room.players.map(p => ({
                            uid: p.id, pseudo: p.username, score: p.score, isWinner: p.id === room.winnerId,
                            specificStats: { starsFound: p.starsFoundCount, turnsTaken: p.turnsTaken }
                        })),
                        matchMetadata: { gridSize: room.gameOptions.gridSize, totalStars: room.stars.length }
                    });
                }
                return { room, moveResult: { type: 'STAR_FOUND', position } };
            } else {
                this.passToNextTurn(room);
                return { room, moveResult: { type: 'AXIS_COUNT', position, count: result.starCount } };
            }
        }
        return { room };
    }

    private passToNextTurn(room: GalakTKGameRoom): void {
        const connectedPlayers = room.players.filter(p => p.status === 'connected');
        const currentIndex = connectedPlayers.findIndex(p => p.id === room.currentTurnPlayerId);
        const nextIndex = (currentIndex + 1) % connectedPlayers.length;
        room.currentTurnPlayerId = connectedPlayers[nextIndex].id;
    }

    public toClientRoom(room: GalakTKGameRoom, requestingPlayerId?: string): GalakTKRoomToSend {
        const scoresRecord: Record<string, number> = {};
        if (room.scores) {
            Object.assign(scoresRecord, room.scores);
        }
        room.players.forEach(p => {
            scoresRecord[p.id] = p.score || 0;
        });

        const clientRoom: GalakTKRoomToSend = {
            ...room,
            stars: [], // On cache les étoiles aux clients
            round: room.round || 1,
            scores: scoresRecord // Garanti non-undefined
        };
        
        return clientRoom as GalakTKRoomToSend;
    }

    public getRoom(roomId: string): GalakTKGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public deleteRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }
}