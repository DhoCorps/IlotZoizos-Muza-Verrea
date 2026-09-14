// apps/game-server/src/games/soonart/SoonArtManager.ts
import { Server } from 'socket.io';
import { 
    SoonArtGameRoom,
    SoonArtRoomToSend, 
    SoonArtPlayer, 
    SoonArtGameOptions, 
    SoonArtMakeMoveRequest,
    SoonArtLogic
} from '@ilot/shared-core';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE ET DE L'ORCHESTRATEUR DE PARIS
import { GameStatsService } from '@ilot/infrastructure';
import { BettingOrchestrator } from '@ilot/shared-core';

export class SoonArtManager {
    private io: Server;
    private rooms: Map<string, SoonArtGameRoom>;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        this.rooms = new Map();
        console.log('[SoonArtManager] Le radar artistique est activé. Prêt pour la recherche de trésors.');
    }

    /**
     * 🎨 CRÉATION DU SALON SOON'ART
     */
    public createRoom(
        roomId: string,
        roomName: string,
        ownerId: string,
        ownerUsername: string,
        ownerSocketId: string,
        options: SoonArtGameOptions & { wagerAmount?: number; wagerCurrency?: string; gameMode?: string; difficulty?: string }
    ): SoonArtGameRoom {
        if (this.rooms.has(roomId)) {
            throw new Error(`Le salon '${roomId}' est déjà ouvert.`);
        }

        const ownerPlayer: SoonArtPlayer = {
            id: ownerId,
            username: ownerUsername,
            socketId: ownerSocketId,
            roomId: roomId,
            status: 'connected',
            isReady: false,
            score: 0,
            gameType: 'SoonArt',
            circlesUsed: 0,
            guesses: []
        };

        const mapWidth = options.mapWidth || 800;
        const mapHeight = options.mapHeight || 600;
        const totalTreasures = options.totalTreasures || 5;
        const maxCircles = options.maxCircles || 10;

        const rawTreasures = SoonArtLogic.generateRandomTreasures(totalTreasures, mapWidth, mapHeight);
        const treasures = Array.isArray(rawTreasures) ? rawTreasures : [];

        const newRoom: SoonArtGameRoom = {
            id: roomId,
            name: roomName,
            players: [ownerPlayer],
            state: 'waiting',
            winnerId: null,
            round: 1,
            gameType: 'SoonArt',
            maxPlayers: 4,
            scores: { [ownerPlayer.id]: 0 },
            gameOptions: { mapWidth, mapHeight, totalTreasures, maxCircles },
            treasures,
            treasuresCount: treasures.length, // 🌟 Sécurisé
            circles: [],
            scanTimeLeft: 120,
            markTimeLeft: 60,
            wagerAmount: options.wagerAmount || 0,
            wagerCurrency: options.wagerCurrency || 'DHO'
        };

        this.rooms.set(roomId, newRoom);
        console.log(`[SoonArtManager] Salon '${roomName}' créé par ${ownerUsername}.`);
        return newRoom;
    }

    /**
     * 🚪 REJOINDRE LE SALON
     */
    public handlePlayerJoin(roomId: string, username: string, socketId: string): SoonArtGameRoom | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        let player = room.players.find(p => p.username === username);

        if (player) {
            player.socketId = socketId;
            player.status = 'connected';
        } else {
            if (room.players.length >= room.maxPlayers) {
                throw new Error("La galerie est pleine !");
            }
            player = {
                id: socketId,
                socketId: socketId,
                username: username,
                roomId: roomId,
                status: 'connected',
                isReady: false,
                score: 0,
                gameType: 'SoonArt',
                circlesUsed: 0,
                guesses: []
            };
            room.players.push(player);
            room.scores[player.id] = 0;
        }

        if (room.state === 'waiting' && room.players.length >= 2) {
            room.state = 'playing';
        }

        return room;
    }

    /**
     * 🔌 GESTION DE LA DÉCONNEXION
     */
    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socketId || p.id === socketId);
        if (player) {
            player.status = 'disconnected';
            console.log(`[SoonArtManager] ${player.username} a quitté la galerie.`);
        }
    }

    /**
     * 🔍 GESTION DES ACTIONS
     */
    public async handleMakeMove(roomId: string, playerId: string, move: SoonArtMakeMoveRequest): Promise<void> {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        if (move.action === 'DRAW_CIRCLE') {
            const { center, radius } = move.payload;
            if (!center || radius === undefined || radius <= 0) return;

            if (player.circlesUsed >= room.gameOptions.maxCircles) {
                this.io.to(player.socketId!).emit('error:message', "Vous avez épuisé tous vos cercles !");
                return;
            }

            player.circlesUsed++;
            const treasureCount = SoonArtLogic.countTreasuresInCircle(center, radius, room.treasures);
            const colorScheme = SoonArtLogic.getColorForDensity(treasureCount, radius);

            const newCircle = {
                id: `circle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                playerId: player.id,
                center,
                radius,
                treasureCount,
                colorScheme
            };

            room.circles.push(newCircle);
            this.io.to(room.id).emit('game:state-update', this.toClientRoom(room));
        } 
        else if (move.action === 'PLACE_GUESS') {
            const { position } = move.payload;
            if (!position) return;

            const { score, matchedId } = SoonArtLogic.calculateGuessAccuracyScore(position, room.treasures);
            player.score += score;
            room.scores[player.id] = player.score;

            player.guesses.push({
                id: `guess_${Date.now()}`,
                playerId: player.id,
                position,
                matchedTreasureId: matchedId,
                accuracyScore: score
            });

            if (matchedId) {
                const treasure = room.treasures.find(t => t.id === matchedId);
                if (treasure) treasure.isDiscovered = true;
            }

            if (room.treasures.every(t => t.isDiscovered)) {
                room.state = 'gameOver';
                let bestPlayer = room.players[0];
                for (const p of room.players) {
                    if (p.score > bestPlayer.score) bestPlayer = p;
                }
                room.winnerId = bestPlayer.id;

                // =========================================================
                // 🌟 SUTURE ÉCONOMIQUE KONTRAKT : Résolution des crédits/paris
                // =========================================================
                try {
                    const wagerAmt = room.wagerAmount || 0;
                    const wagerCur = room.wagerCurrency || 'DHO';
                    const difficultyVal = (room.gameOptions as any).difficulty || 'Artisan';
                    const modeVal = (room.gameOptions as any).gameMode || 'MULTIPLAYER';

                    if (wagerAmt > 0 && room.winnerId) {
                        for (const p of room.players) {
                            const isWinner = p.id === room.winnerId;
                            await BettingOrchestrator.resolveGameAndCalculateCredit(
                                p.id,
                                'SoonArt',
                                modeVal,
                                difficultyVal,
                                wagerCur,
                                wagerAmt,
                                isWinner
                            );
                        }
                    }
                } catch (econErr) {
                    console.error(`[SoonArtManager] Erreur KonTraKt pour la salle ${roomId}:`, econErr);
                }
                // =========================================================
                
                // 💾 ARCHIVAGE
                GameStatsService.recordMatch({
                    gameType: 'SoonArt',
                    roomId: room.id,
                    startedAt: new Date(),
                    endedAt: new Date(),
                    durationSeconds: 180,
                    players: room.players.map(p => ({
                        uid: p.id, pseudo: p.username, score: p.score, isWinner: p.id === room.winnerId,
                        specificStats: { circlesUsed: p.circlesUsed, guesses: p.guesses.length }
                    })),
                    matchMetadata: {}
                });
            }
        }
    }

    public toClientRoom(room: SoonArtGameRoom): SoonArtRoomToSend {
        const clientRoom = { ...room } as SoonArtRoomToSend;
        clientRoom.treasures = room.treasures.map(t => ({
            ...t,
            position: t.isDiscovered ? t.position : { x: -1, y: -1 }
        }));
        return clientRoom;
    }

    public getRoom(roomId: string): SoonArtGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public deleteRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }
}