// apps/game-server/src/server.ts
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Import des types partagés
import { 
    RoomToSend,
    CreateRoomRequest,
    GameType,
    BaseMakeMoveRequest,
    AnyGameRoom,
    PlayerStatus
} from '@ilot/shared-core';

// Import des managers
import { CrazyMorpionManager } from '../games/crazymorpion/CrazyMorpionManager';
import { KoOonTreeZManager } from '../games/kooontreez/KoOonTreeZManager';
import { AtomikKFardEManager } from '../games/atomik-k-far/Atomik-K-FarManager'; 
import { CineMaxManager } from '../games/cinemax/CineMaxManager'; 
import { SoonArtManager } from '../games/soonart/SoonArtManager'; 
import { GalakTKManager } from '../games/galak-t-k/GalakTKManager'; 
import { PlumZeeManager } from '../games/plumzee/PlumZeeManager'; 
import { WikiOracleManager } from '../games/wikioracle/WikiOracleManager'; 

// Initialisation Sentry
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
});

const PORT = process.env.PORT || 3002;
const REDIS_URI = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// --- Initialisation des Gestionnaires ---
const managers = {
    CrazyMorpion: new CrazyMorpionManager(io),
    KoOonTreeZ: new KoOonTreeZManager(io),
    AtomikKFardE: new AtomikKFardEManager(io),
    CineMax: new CineMaxManager(io),
    SoonArt: new SoonArtManager(io),
    GalakTK: new GalakTKManager(io),
    PlumZee: new PlumZeeManager(io),
    WikiOracle: new WikiOracleManager(io),
};

const rooms: Map<string, AnyGameRoom> = new Map();
const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
const playerRooms: Map<string, string> = new Map();

// --- Logique d'envoi client unifiée ---
function roomToRoomToSend(room: AnyGameRoom, requestingPlayerId?: string): RoomToSend {
    const manager = managers[room.gameType as GameType];
    if (!manager) throw new Error(`Manager introuvable pour ${room.gameType}`);
    
    // On délègue la transformation au manager dédié
    return (manager as any).toClientRoom(room, requestingPlayerId);
}

function getAllRoomsToSend(): RoomToSend[] {
    return Array.from(rooms.values())
        .filter(room => !disconnectTimers.has(room.id)) 
        .map(room => roomToRoomToSend(room));
}

// --- Bootstrap ---
async function bootstrapServer() {
    try {
        const pubClient = createClient({ url: REDIS_URI });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('⚡ [Game Server] Adaptateur Redis actif.');
    } catch (e) {
        console.warn('⚠️ Redis désactivé, mode local.');
    }

    io.on('connection', (socket: Socket) => {
        
        socket.on('room:create', (payload: any) => {
            const { username, roomName, gameType } = payload;
            const roomId = Date.now().toString();
            
            try {
                const manager = managers[gameType as GameType] as any;
                if (!manager) throw new Error('Jeu inconnu.');

                // On passe les 6 arguments attendus par les managers :
                // (roomId, roomName, ownerId, ownerUsername, ownerSocketId, options)
                const newRoom = manager.createRoom(
                    roomId, 
                    roomName || `Salon de ${username}`, 
                    socket.id, 
                    username, 
                    socket.id, 
                    payload
                );
                
                if (newRoom) {
                    rooms.set(roomId, { ...newRoom, gameType } as AnyGameRoom);
                }
                
                socket.join(roomId);
                playerRooms.set(socket.id, roomId);

                io.to(socket.id).emit('room:created', roomToRoomToSend(rooms.get(roomId)!));
                io.emit('room:list', getAllRoomsToSend());
            } catch (e: any) {
                socket.emit('error:message', e.message);
            }
        });

        socket.on('room:join', ({ roomId, username }) => {
            const room = rooms.get(roomId);
            if (!room) return socket.emit('error:message', 'Salon introuvable.');

            socket.join(roomId);
            playerRooms.set(socket.id, roomId);
            
            const manager = managers[room.gameType as GameType] as any;
            manager.handlePlayerJoin(roomId, username, socket.id);
            
            const updated = manager.getRoom(roomId);
            if (updated) {
                // 🛡️ Cast explicite pour rassurer TypeScript sur l'union des types de rooms
                rooms.set(roomId, { ...updated, gameType: room.gameType } as AnyGameRoom);
            }
            
            io.to(roomId).emit('room:updated', roomToRoomToSend(rooms.get(roomId)!));
            io.emit('room:list', getAllRoomsToSend());
        });
        socket.on('game:make-move', (data: BaseMakeMoveRequest) => {
            const room = rooms.get(data.roomId);
            if (!room) return;

            try {
                // On caste le manager en any pour unifier l'appel (gère handleMakeMove, handleSubmitAnswer, etc.)
                const manager = managers[room.gameType as GameType] as any;
                
                if (typeof manager.handleMakeMove === 'function') {
                    manager.handleMakeMove(data.roomId, data.playerId, data);
                } else if (room.gameType === 'KoOonTreeZ' && typeof manager.handleSubmitAnswer === 'function') {
                    manager.handleSubmitAnswer(data.roomId, data.playerId, (data as any).answer);
                } else if (room.gameType === 'WikiOracle' && typeof manager.handleSubmitAnswer === 'function') {
                    manager.handleSubmitAnswer(data.roomId, data.playerId, (data as any).answer);
                }

                const updated = manager.getRoom(data.roomId);
                if (updated) {
                    // On force le typage AnyGameRoom pour rassurer TypeScript sur la structure globale
                    rooms.set(data.roomId, { ...updated, gameType: room.gameType } as AnyGameRoom);
                }
                
                const clientRoom = roomToRoomToSend(rooms.get(data.roomId)!);
                io.to(data.roomId).emit('game:state-update', clientRoom);
            } catch (e: any) {
                socket.emit('error:message', e.message);
            }
        });

        // ... (Tu peux garder les autres handlers de restart/start spécifiques)

        socket.on('disconnect', () => {
            const roomId = playerRooms.get(socket.id);
            if (roomId) {
                const room = rooms.get(roomId);
                if (room) {
                    managers[room.gameType as GameType].notifyPlayerDisconnect(socket.id, roomId);
                    io.emit('room:list', getAllRoomsToSend());
                }
                playerRooms.delete(socket.id);
            }
        });
    });

    httpServer.listen(PORT, () => console.log(`[SERVER] En écoute sur le port ${PORT}`));
}

bootstrapServer();