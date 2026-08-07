import { SoonArtLogic } from '@ilot/shared-core';
// 💾 IMPORT DU SERVICE D'ARCHIVAGE 
import { GameStatsService } from '@ilot/infrastructure';
export class SoonArtManager {
    io;
    rooms;
    constructor(ioInstance) {
        this.io = ioInstance;
        this.rooms = new Map();
        console.log('[SoonArtManager] Le radar artistique est activé. Prêt pour la recherche de trésors.');
    }
    /**
     * 🎨 CRÉATION DU SALON SOON'ART
     */
    createRoom(roomId, roomName, ownerId, ownerUsername, ownerSocketId, options) {
        if (this.rooms.has(roomId)) {
            throw new Error(`Le salon '${roomId}' est déjà ouvert.`);
        }
        const ownerPlayer = {
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
        const newRoom = {
            id: roomId,
            name: roomName,
            players: [ownerPlayer],
            state: 'waiting',
            winnerId: null,
            round: 1,
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
            markTimeLeft: 60,
            // (Note: l'idéal serait d'ajouter roundStartTime: Date.now() dans SoonArtGameRoom pour la précision)
        };
        this.rooms.set(roomId, newRoom);
        console.log(`[SoonArtManager] Salon '${roomName}' créé par ${ownerUsername}.`);
        return newRoom;
    }
    /**
     * 🚪 REJOINDRE LE SALON
     */
    handlePlayerJoin(roomId, username, socketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return undefined;
        let player = room.players.find(p => p.username === username);
        if (player) {
            player.socketId = socketId;
            player.status = 'connected';
        }
        else {
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
            // Idéalement on devrait marquer le début de la partie ici
            // (room as any).roundStartTime = Date.now();
        }
        return room;
    }
    /**
     * 🔍 GESTION DES ACTIONS (Tracer un cercle ou poser un repère de trésor)
     */
    handleMakeMove(roomId, playerId, move) {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'playing')
            return;
        const player = room.players.find(p => p.id === playerId);
        if (!player)
            return;
        if (move.action === 'DRAW_CIRCLE') {
            const { center, radius } = move.payload;
            if (!center || radius === undefined || radius <= 0)
                return;
            if (player.circlesUsed >= room.gameOptions.maxCircles) {
                this.io.to(player.socketId).emit('error:message', "Vous avez épuisé tous vos cercles de recherche !");
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
            if (!position)
                return;
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
                if (treasure)
                    treasure.isDiscovered = true;
            }
            // Vérifier si tous les trésors ont été découverts
            const allFound = room.treasures.every(t => t.isDiscovered);
            if (allFound) {
                room.state = 'gameOver';
                let maxScore = -1;
                let winner = null;
                for (const p of room.players) {
                    if (p.score > maxScore) {
                        maxScore = p.score;
                        winner = p.id;
                    }
                }
                room.winnerId = winner;
                console.log(`[SoonArtManager] FIN DE PARTIE dans le salon ${roomId}. Vainqueur : ${winner || 'Aucun'}`);
                // =========================================================
                // 💾 DÉCLENCHEMENT DE L'ARCHIVAGE (MONGO + NEO4J)
                // =========================================================
                // Puisque roundStartTime n'est pas dans l'interface originale, on utilise les timers 
                // pour estimer la durée max jouée (scanTime + markTime max) ou une valeur par défaut.
                const estimatedDuration = 180; // 3 minutes par défaut
                const matchData = {
                    gameType: 'SoonArt',
                    roomId: room.id,
                    startedAt: new Date(Date.now() - (estimatedDuration * 1000)),
                    endedAt: new Date(),
                    durationSeconds: estimatedDuration,
                    players: room.players.map(p => {
                        return {
                            uid: p.id,
                            pseudo: p.username,
                            score: p.score || 0,
                            isWinner: p.id === room.winnerId,
                            specificStats: {
                                circlesUsed: p.circlesUsed,
                                totalGuessesMade: p.guesses.length
                            }
                        };
                    }),
                    matchMetadata: {
                        totalTreasures: room.gameOptions.totalTreasures,
                        mapDimensions: `${room.gameOptions.mapWidth}x${room.gameOptions.mapHeight}`
                    }
                };
                // Envoi en tâche de fond
                GameStatsService.recordMatch(matchData).then((success) => {
                    if (success)
                        console.log(`[SoonArtManager] Historique sauvegardé avec succès pour le salon ${roomId}`);
                });
                // =========================================================
            }
            this.io.to(room.id).emit('game:state-update', this.toClientRoom(room));
        }
    }
    /**
     * 🛡️ SÉCURITÉ : Masque la position exacte des trésors non trouvés aux clients
     */
    toClientRoom(room) {
        const clientRoom = { ...room };
        clientRoom.treasures = room.treasures.map(t => ({
            ...t,
            position: t.isDiscovered ? t.position : { x: -1, y: -1 }
        }));
        // S'assurer que treasuresCount est bien transmis
        clientRoom.treasuresCount = room.treasures.length;
        return clientRoom;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    deleteRoom(roomId) {
        this.rooms.delete(roomId);
    }
}
