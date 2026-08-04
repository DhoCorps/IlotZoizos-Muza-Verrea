// apps/game-server/src/games/soonart/SoonArtManager.ts
import { Server } from 'socket.io';
import { 
    SoonArtGameRoom, 
    SoonArtPlayer, 
    SoonArtGameOptions, 
    SoonArtMakeMoveRequest,
    SoonArtLogic
} from '@ilot/shared-core';

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
        options: SoonArtGameOptions
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

        // Génération secrète des trésors sur la carte

        const treasures = SoonArtLogic.generateRandomTreasures(totalTreasures, mapWidth, mapHeight);

        const newRoom: SoonArtGameRoom = {
            id: roomId,
            name: roomName,
            players: [ownerPlayer],
            state: 'waiting',
            winnerId: null,
            round: 1,
            chatMessages: [],
            gameType: 'SoonArt',
            maxPlayers: 4,
            scores: { [ownerPlayer.id]: 0 },
            gameOptions: {
                mapWidth,
                mapHeight,
                totalTreasures,
                maxCircles
            },
            treasures,
            treasuresCount: treasures.length, // <--- ICI : C'est la propriété qui manquait !
            circles: [],
            scanTimeLeft: 120,
            markTimeLeft: 60
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
     * 🔍 GESTION DES ACTIONS (Tracer un cercle ou poser un repère de trésor)
     */
    public handleMakeMove(roomId: string, playerId: string, move: SoonArtMakeMoveRequest): void {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        if (move.action === 'DRAW_CIRCLE') {
            const { center, radius } = move.payload;
            if (!center || radius === undefined || radius <= 0) return;

            if (player.circlesUsed >= room.gameOptions.maxCircles) {
                this.io.to(player.socketId!).emit('error:message', "Vous avez épuisé tous vos cercles de recherche !");
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

            // Vérifier si tous les trésors ont été découverts
            const allFound = room.treasures.every(t => t.isDiscovered);
            if (allFound) {
                room.state = 'gameOver';
                let maxScore = -1;
                let winner: string | null = null;
                for (const p of room.players) {
                    if (p.score > maxScore) {
                        maxScore = p.score;
                        winner = p.id;
                    }
                }
                room.winnerId = winner;
            }

            this.io.to(room.id).emit('game:state-update', this.toClientRoom(room));
        }
    }

    /**
     * 🛡️ SÉCURITÉ : Masque la position exacte des trésors non trouvés aux clients
     */
   public toClientRoom(room: SoonArtGameRoom): any {
        const clientRoom = { ...room };
        clientRoom.treasures = room.treasures.map(t => ({
            ...t,
            position: t.isDiscovered ? t.position : { x: -1, y: -1 }
        }));
        // S'assurer que treasuresCount est bien transmis
        clientRoom.treasuresCount = room.treasures.length;
        return clientRoom;
    }

    public getRoom(roomId: string): SoonArtGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public deleteRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }
}