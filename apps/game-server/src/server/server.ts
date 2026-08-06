// Ce fichier gère la logique principale du serveur Socket.IO et la délégation modulaire aux gestionnaires de jeu.

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

import { 
    CrazyMorpionSymbol, 
    CrazyMorpionGrid,
    CrazyMorpionGameRoom,
    KoOonTreeZGameRoom, 
    KoOonTreeZPlayer,
    AtomikKFardEGameRoom, 
    Player as AtomikPlayer,
    CineMaxGameRoom, 
    SoonArtGameRoom, 
    GalakTKGameRoom, 
    PlumZeeGameRoom,
    BaseMakeMoveRequest,
    CrazyMorpionMakeMoveRequest,
    KoOonTreeZMakeMoveRequest,
    AtomikKFardEMakeMoveRequest,
    CineMaxMakeMoveRequest, 
    SoonArtMakeMoveRequest, 
    GalakTKMakeMoveRequest, 
    PlumZeeMakeMoveRequest, 
    RoomToSend,
    CreateRoomRequest,
    PlayerInRoom,
    GameType,
    CrazyMorpionPlayerClient,
    KoOonTreeZPlayerClient,
    AtomikKFardEGameOptions,
    CineMaxDifficultyRule,
    KoOonTreezNbPlayer,
    KoOonTreezMode,
    KoOonTreezOption,
    KoOonTreezLevel,
    KoOonTreezSoloMode,
    CurrentFlag,
    AtomikKFardENbPlayer,
    AtomikKFardEMode, 
    AtomikKFardEOption, 
    AtomikKFardEStyle  
} from '@ilot/shared-core';

import { CrazyMorpionManager } from '../games/crazymorpion/CrazyMorpionManager';
import { KoOonTreeZManager } from '../games/kooontreez/KoOonTreeZManager';
import { AtomikKFardEManager } from '../games/atomik-k-far/Atomik-K-FarManager'; 
import { CineMaxManager } from '../games/cinemax/CineMaxManager'; 
import { SoonArtManager } from '../games/soonart/SoonArtManager'; 
import { GalakTKManager } from '../games/galak-t-k/GalakTKManager'; 
import { PlumZeeManager } from '../games/plumzee/PlumZeeManager'; 

// --- Configuration de base du serveur ---
const PORT = process.env.PORT || 3002;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const publicPath = path.join(projectRoot, 'public');
console.log(`[SERVER] Le dossier 'public' est servi depuis: ${publicPath}`);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath, { extensions: ['html'] }));
app.use('/Games', express.static(path.join(publicPath, 'Games'), { extensions: ['html'] }));
app.use('/bootstrap', express.static(path.join(projectRoot, 'node_modules/bootstrap/dist')));
app.use('/jquery', express.static(path.join(projectRoot, 'node_modules/jquery/dist')));
app.use('/socket.io', express.static(path.join(projectRoot, 'node_modules/socket.io-client/dist')));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- Initialisation des Gestionnaires ---
const crazyMorpionManager = new CrazyMorpionManager(io);
const koOonTreeZManager = new KoOonTreeZManager(io);
const atomikKFardEManager = new AtomikKFardEManager(io); 
const cineMaxManager = new CineMaxManager(io);
const soonArtManager = new SoonArtManager(io);
const galakTKManager = new GalakTKManager(io);
const plumZeeManager = new PlumZeeManager(io);

// --- État global des salons en mémoire ---
const rooms: Map<string, any> = new Map();
const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
const playerRooms: Map<string, string> = new Map();

const ROOM_DELETION_GRACE_PERIOD_MS = 10000;

// --- Conversion unifiée des salons pour le client ---
function roomToRoomToSend(room: any, requestingPlayerId?: string): RoomToSend {
    switch (room.gameType) {
        case 'AtomikKFardE':
            return atomikKFardEManager.toClientRoom(room);
        case 'CineMax':
            return cineMaxManager.toClientRoom(room);
        case 'SoonArt':
            return soonArtManager.toClientRoom(room);
        case 'GalakTK':
            return galakTKManager.toClientRoom(room, requestingPlayerId);
        case 'PlumZee':
            return plumZeeManager.toClientRoom(room);
        case 'CrazyMorpion': {
            const playersToSend = room.players.map((p: any) => ({
                id: p.id, username: p.username, symbol: p.symbol, score: p.score, roomId: p.roomId, status: p.status
            } as CrazyMorpionPlayerClient));
            return {
                id: room.id, name: room.name, gameType: room.gameType, scores: room.scores || {},
                players: playersToSend, state: room.state, winnerId: room.winnerId, round: room.round,
                maxPlayers: room.maxPlayers, grid: room.grid, winningCells: room.winningCells, currentTurnPlayerId: room.currentTurnPlayerId
            } as RoomToSend;
        }
        case 'KoOonTreeZ': {
            const playersToSend = room.players.map((p: any) => ({
                id: p.id, username: p.username, score: p.score, roomId: p.roomId, status: p.status
            } as KoOonTreeZPlayerClient));
            return {
                id: room.id, name: room.name, gameType: room.gameType, scores: room.scores || {},
                players: playersToSend, state: room.state, winnerId: room.winnerId, round: room.round,
                maxPlayers: room.maxPlayers, kooonTreezNbPlayer: room.kooonTreezNbPlayer, kooonTreezMode: room.kooonTreezMode,
                kooonTreezOption: room.kooonTreezOption, kooonTreezLevel: room.kooonTreezLevel, currentRoundTimeLeft: room.currentRoundTimeLeft,
                totalFlagsRecognized: room.totalFlagsRecognized, targetFlagsCount: room.targetFlagsCount, currentFlag: room.currentFlag
            } as RoomToSend;
        }
        default:
            throw new Error(`Type de jeu inconnu lors de la conversion du salon: ${room.gameType}`);
    }
}

function getAllRoomsToSend(): RoomToSend[] {
    return Array.from(rooms.values())
        .filter(room => !disconnectTimers.has(room.id)) 
        .map(room => roomToRoomToSend(room));
}

// Fonction utilitaire pour synchroniser le salon depuis son manager respectif
function syncRoomFromManager(roomId: string, gameType: GameType): any | undefined {
    let roomFromManager;
    switch (gameType) {
        case 'CrazyMorpion': roomFromManager = crazyMorpionManager.getRoom(roomId); break;
        case 'KoOonTreeZ': roomFromManager = koOonTreeZManager.getRoom(roomId); break;
        case 'AtomikKFardE': roomFromManager = atomikKFardEManager.getRoom(roomId); break;
        case 'CineMax': roomFromManager = (cineMaxManager as any).rooms?.get(roomId); break;
        case 'SoonArt': roomFromManager = soonArtManager.getRoom(roomId); break;
        case 'GalakTK': roomFromManager = galakTKManager.getRoom(roomId); break;
        case 'PlumZee': roomFromManager = plumZeeManager.getRoom(roomId); break;
    }
    if (roomFromManager) {
        return { ...roomFromManager, gameType };
    }
    return undefined;
}

function notifyDisconnectToManager(gameType: GameType, socketId: string, roomId: string) {
    switch (gameType) {
        case 'CrazyMorpion': crazyMorpionManager.notifyPlayerDisconnect(socketId, roomId); break;
        case 'KoOonTreeZ': koOonTreeZManager.notifyPlayerDisconnect(socketId, roomId); break;
        case 'AtomikKFardE': atomikKFardEManager.notifyPlayerDisconnect(socketId, roomId); break;
        case 'PlumZee': plumZeeManager.notifyPlayerDisconnect(socketId, roomId); break;
    }
}

function deleteRoomFromManager(gameType: GameType, roomId: string) {
    switch (gameType) {
        case 'CrazyMorpion': crazyMorpionManager.deleteRoom(roomId); break;
        case 'KoOonTreeZ': koOonTreeZManager.deleteRoom(roomId); break;
        case 'AtomikKFardE': atomikKFardEManager.deleteRoom(roomId); break;
        case 'SoonArt': soonArtManager.deleteRoom(roomId); break;
        case 'GalakTK': galakTKManager.deleteRoom(roomId); break;
        case 'PlumZee': plumZeeManager.deleteRoom(roomId); break;
    }
}

// --- Logique du serveur Socket.IO ---
io.on('connection', (socket: Socket) => {
    console.log(`[SERVER] Utilisateur connecté: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`[SERVER] Joueur déconnecté: ${socket.id}`);
        
        const disconnectedRoomId = playerRooms.get(socket.id);
        if (!disconnectedRoomId) return;

        const room = rooms.get(disconnectedRoomId);
        if (!room) return;

        notifyDisconnectToManager(room.gameType, socket.id, room.id);

        const updatedRoomFromManager = syncRoomFromManager(room.id, room.gameType);
        if (updatedRoomFromManager) {
            rooms.set(room.id, updatedRoomFromManager);
        }

        const allPlayersEffectivelyDisconnected = updatedRoomFromManager?.players.every((p: any) => {
            if (updatedRoomFromManager?.gameType === 'AtomikKFardE') {
                const atomikPlayer = updatedRoomFromManager.players.find((ap: any) => ap.id === p.id) as AtomikPlayer;
                return atomikPlayer && atomikPlayer.status === 'disconnected';
            }
            return p.status === 'disconnected' || p.status === 'disconnected_temp';
        }) || false;

        if (allPlayersEffectivelyDisconnected) {
            if (disconnectTimers.has(room.id)) {
                clearTimeout(disconnectTimers.get(room.id)!);
                disconnectTimers.delete(room.id);
            }
            const timer = setTimeout(() => {
                const finalRoomState = rooms.get(room.id);
                const playersStillDisconnected = finalRoomState?.players.every((p: any) => {
                    if (finalRoomState.gameType === 'AtomikKFardE') {
                        const atomikPlayer = finalRoomState.players.find((ap: any) => ap.id === p.id) as AtomikPlayer;
                        return atomikPlayer && atomikPlayer.status === 'disconnected';
                    }
                    return p.status === 'disconnected';
                }) || false;

                if (finalRoomState && playersStillDisconnected) {
                    rooms.delete(room.id);
                    disconnectTimers.delete(room.id);
                    deleteRoomFromManager(room.gameType, room.id);
                    io.emit('room:list', getAllRoomsToSend());
                }
            }, ROOM_DELETION_GRACE_PERIOD_MS);
            disconnectTimers.set(room.id, timer);
        } else {
            io.emit('room:list', getAllRoomsToSend());
        }
        
        playerRooms.delete(socket.id);
    });

    socket.on('room:create', (payload: CreateRoomRequest & { 
        atomikKFardENbPlayer?: AtomikKFardENbPlayer; 
        atomikKFardEMode?: AtomikKFardEMode; 
        atomikKFardEOption?: AtomikKFardEOption; 
        atomikKFardEGameStyle?: AtomikKFardEStyle; 
        cineMaxNbPlayer?: any;
        cineMaxDifficultyRule?: CineMaxDifficultyRule;
        cineMaxTimePerRound?: number;
        cineMaxMaxRounds?: number;
        cineMaxScoreToWin?: number;
        soonArtTotalTreasures?: number;
        soonArtMaxCircles?: number;
        galakTKGridWidth?: number;
        galakTKGridHeight?: number;
        galakTKGridSize?: 'small' | 'medium' | 'large';
        galakTKTotalStars?: number;
        galakTKMode?: 'global' | 'local';
        plumZeeMaxRounds?: number;
        plumZeeTurnTimeLimit?: number;
    }) => {
        const { 
            username, roomName, gameType, 
            kooonTreezNbPlayer, kooonTreezMode, kooonTreezOption, kooonTreezLevel, kooonTreezSoloMode, 
            atomikKFardENbPlayer, atomikKFardEMode, atomikKFardEOption, atomikKFardEGameStyle,
            cineMaxNbPlayer, cineMaxDifficultyRule, cineMaxTimePerRound, cineMaxScoreToWin, cineMaxMaxRounds,
            soonArtTotalTreasures, soonArtMaxCircles,
            galakTKGridWidth, galakTKGridHeight, galakTKTotalStars, galakTKMode,
            plumZeeMaxRounds, plumZeeTurnTimeLimit
        } = payload;
        
        const roomId = Date.now().toString();
        let newRoomServer: any = null;
        let roomToSendToClient: RoomToSend | null = null;
        const ownerPlayerId = socket.id; 

        const atomikKFardEOptions: AtomikKFardEGameOptions = {
            nbPlayer: atomikKFardENbPlayer || 'duo',
            mode: atomikKFardEMode || 'Stratege',
            option: atomikKFardEOption || 'Alex Kid',
            teamMode: atomikKFardEGameStyle === 'Conquête' ? 'Blind' : 'Random',
            gameStyle: atomikKFardEGameStyle || 'Conquête',
            timePerRound: 30,
            maxRounds: 5,
            scoreToWin: 3
        };

        try {
            switch (gameType) {
                case 'CrazyMorpion': {
                    const creator = { 
                        id: ownerPlayerId, 
                        username, 
                        socketId: socket.id, 
                        score: 0, 
                        roomId, 
                        status: 'connected' as any, // Force le type PlayerStatus attendu
                        isReady: false, 
                        symbol: '' as CrazyMorpionSymbol 
                    };
                    const rf = crazyMorpionManager.createRoom(roomId, roomName || `Salon de ${username}`, creator);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = roomToRoomToSend(newRoomServer);
                    break;
                }
                case 'KoOonTreeZ': {
                    const options = { 
                        kooonTreezNbPlayer: kooonTreezNbPlayer || 'duo', 
                        kooonTreezMode: kooonTreezMode || 'DvsP', 
                        kooonTreezOption: kooonTreezOption || 'Champ-De-Bataille', 
                        kooonTreezLevel: kooonTreezLevel || 'easy', 
                        kooonTreezSoloMode: (kooonTreezSoloMode as KoOonTreezSoloMode) || 'training' 
                    };
                    const creator = { 
                        id: ownerPlayerId, 
                        username, 
                        socketId: socket.id, 
                        score: 0, 
                        roomId, 
                        status: 'connected' as any, // Force le type PlayerStatus attendu
                        isReady: false 
                    };
                    const rf = koOonTreeZManager.createRoom(roomId, roomName || `Salon de ${username}`, creator, options);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = roomToRoomToSend(newRoomServer);
                    break;
                }
                case 'AtomikKFardE': {
                    const rf = atomikKFardEManager.createRoom(roomId, roomName || `Salon de ${username}`, ownerPlayerId, username, socket.id, atomikKFardEOptions);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = atomikKFardEManager.toClientRoom(newRoomServer);
                    break;
                }
                case 'CineMax': {
                    const options = { nbPlayer: cineMaxNbPlayer || 'duo', timePerRound: cineMaxTimePerRound || 120, scoreToWin: cineMaxScoreToWin || 100, difficultyRule: cineMaxDifficultyRule || 'SERVER_CHAOS', maxRounds: cineMaxMaxRounds || 5 };
                    const rf = cineMaxManager.createRoom(roomId, roomName || `Salon de ${username}`, ownerPlayerId, username, socket.id, options);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = cineMaxManager.toClientRoom(newRoomServer);
                    break;
                }
                case 'SoonArt': {
                    const options = { mapWidth: 800, mapHeight: 600, totalTreasures: soonArtTotalTreasures || 5, maxCircles: soonArtMaxCircles || 10 };
                    const rf = soonArtManager.createRoom(roomId, roomName || `Galerie de ${username}`, ownerPlayerId, username, socket.id, options);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = soonArtManager.toClientRoom(newRoomServer);
                    break;
                }
                case 'GalakTK': {
                    const options = { gridWidth: galakTKGridWidth || 8, gridHeight: galakTKGridHeight || 8, gridSize: payload.galakTKGridSize || 'medium', totalStars: galakTKTotalStars || 8, mode: galakTKMode || 'global' };
                    const rf = galakTKManager.createRoom(roomId, roomName || `Secteur de ${username}`, ownerPlayerId, username, socket.id, options);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = galakTKManager.toClientRoom(newRoomServer, ownerPlayerId);
                    break;
                }
                case 'PlumZee': {
                    const options = { maxRounds: plumZeeMaxRounds || 13, turnTimeLimitSec: plumZeeTurnTimeLimit || 60 };
                    const rf = plumZeeManager.createRoom(roomId, roomName || `Boulier de ${username}`, ownerPlayerId, username, socket.id, options);
                    newRoomServer = { ...rf, gameType };
                    roomToSendToClient = plumZeeManager.toClientRoom(newRoomServer);
                    break;
                }
                default:
                    throw new Error('Type de jeu non pris en charge.');
            }

            if (newRoomServer && roomToSendToClient) {
                rooms.set(roomId, newRoomServer);
                socket.join(roomId);
                playerRooms.set(socket.id, roomId);

                io.to(socket.id).emit('room:created', roomToSendToClient);
                io.emit('room:list', getAllRoomsToSend());
            }
        } catch (error: any) {
            socket.emit('error:message', error.message || 'Erreur inattendue.');
        }
    });

    socket.on('room:join', ({ roomId, username }: { roomId: string, username: string }) => {
        const room = rooms.get(roomId);
        if (!room) {
            return socket.emit('error:message', 'Ce salon n\'existe pas.');
        }

        if (disconnectTimers.has(roomId)) {
            clearTimeout(disconnectTimers.get(roomId)!);
            disconnectTimers.delete(roomId);
        }

        socket.join(roomId);
        playerRooms.set(socket.id, roomId);

        let updatedGameRoom: any;
        switch (room.gameType) {
            case 'CrazyMorpion': updatedGameRoom = syncRoomFromManager(roomId, 'CrazyMorpion'); crazyMorpionManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'KoOonTreeZ': koOonTreeZManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'AtomikKFardE': atomikKFardEManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'CineMax': cineMaxManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'SoonArt': soonArtManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'GalakTK': galakTKManager.handlePlayerJoin(roomId, username, socket.id); break;
            case 'PlumZee': plumZeeManager.handlePlayerJoin(roomId, username, socket.id); break;
        }
        
        updatedGameRoom = syncRoomFromManager(roomId, room.gameType);

        if (updatedGameRoom) {
            rooms.set(roomId, updatedGameRoom);
            for (const sockId of io.sockets.adapter.rooms.get(roomId) || []) {
                io.to(sockId).emit('room:updated', roomToRoomToSend(updatedGameRoom, sockId));
            }
            io.emit('room:list', getAllRoomsToSend());
        } else {
            socket.emit('error:message', `Impossible de rejoindre le salon ${roomId}.`);
        }
    });

    socket.on('room:get-all', () => {
        socket.emit('room:list', getAllRoomsToSend());
    });

    socket.on('room:leave', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        socket.leave(roomId);
        playerRooms.delete(socket.id);

        notifyDisconnectToManager(room.gameType, socket.id, room.id);
        const updatedRoomFromManager = syncRoomFromManager(room.id, room.gameType);

        if (updatedRoomFromManager) {
            rooms.set(roomId, updatedRoomFromManager);
            for (const sockId of io.sockets.adapter.rooms.get(roomId) || []) {
                io.to(sockId).emit('room:updated', roomToRoomToSend(updatedRoomFromManager, sockId));
            }
        }
        io.emit('room:list', getAllRoomsToSend());
    });

    socket.on('game:make-move', (data: BaseMakeMoveRequest) => {
        const room = rooms.get(data.roomId);
        if (!room) return socket.emit('error:message', 'Salon non trouvé.');

        try {
            switch (data.gameType) {
                case 'CrazyMorpion': {
                    const d = data as CrazyMorpionMakeMoveRequest;
                    crazyMorpionManager.handleMakeMove(d.roomId, d.playerId, d.x, d.y, d.chosenSymbol);
                    break;
                }
                case 'KoOonTreeZ': {
                    const d = data as KoOonTreeZMakeMoveRequest;
                    koOonTreeZManager.handleSubmitAnswer(d.roomId, d.playerId, d.answer);
                    break;
                }
                case 'AtomikKFardE': {
                    const d = data as AtomikKFardEMakeMoveRequest;
                    atomikKFardEManager.handleMakeMove(d.roomId, d.playerId, d.action);
                    break;
                }
                case 'CineMax': {
                    const d = data as CineMaxMakeMoveRequest;
                    cineMaxManager.handleMakeMove(d.roomId, d.playerId, d);
                    break;
                }
                case 'SoonArt': {
                    const d = data as SoonArtMakeMoveRequest;
                    soonArtManager.handleMakeMove(d.roomId, d.playerId, d);
                    break;
                }
                case 'GalakTK': {
                    const d = data as GalakTKMakeMoveRequest;
                    galakTKManager.handleMakeMove(d.roomId, d.playerId, d);
                    break;
                }
                case 'PlumZee': {
                    const d = data as PlumZeeMakeMoveRequest;
                    plumZeeManager.handleMakeMove(d.roomId, d.playerId, d);
                    break;
                }
            }
        } catch (error: any) {
            socket.emit('error:message', `Action invalide: ${error.message}`);
            return;
        }

        const updatedGameRoom = syncRoomFromManager(data.roomId, room.gameType);
        if (updatedGameRoom) {
            rooms.set(updatedGameRoom.id, updatedGameRoom);
            for (const sockId of io.sockets.adapter.rooms.get(updatedGameRoom.id) || []) {
                io.to(sockId).emit('game:state-update', roomToRoomToSend(updatedGameRoom, sockId));
            }
            io.emit('room:list', getAllRoomsToSend());
        }
    });

    socket.on('kooontreez:start-game', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room?.gameType === 'KoOonTreeZ') {
            koOonTreeZManager.startGame(roomId);
            const rf = syncRoomFromManager(roomId, 'KoOonTreeZ');
            if (rf) {
                rooms.set(roomId, rf);
                io.to(roomId).emit('game:state-update', roomToRoomToSend(rf));
                io.emit('room:list', getAllRoomsToSend());
            }
        }
    });

    socket.on('atomikkfarde:start-game', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room?.gameType === 'AtomikKFardE') {
            try {
                atomikKFardEManager.startGame(room);
                const rf = syncRoomFromManager(roomId, 'AtomikKFardE');
                if (rf) {
                    rooms.set(roomId, rf);
                    io.to(roomId).emit('game:state-update', roomToRoomToSend(rf));
                    io.emit('room:list', getAllRoomsToSend());
                }
            } catch (error: any) {
                socket.emit('error:message', `Erreur au démarrage: ${error.message}`);
            }
        }
    });

    socket.on('game:restart-request', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        try {
            switch (room.gameType) {
                case 'CrazyMorpion': crazyMorpionManager.handleRestartRequest(roomId, socket.id); break;
                case 'KoOonTreeZ': koOonTreeZManager.handleRestartRequest(roomId, socket.id); break;
                case 'AtomikKFardE': atomikKFardEManager.handleRestartRequest(roomId, socket.id); break;
                case 'PlumZee': plumZeeManager.handleRestartRequest(roomId, socket.id); break;
            }
        } catch (error: any) {
            socket.emit('error:message', `Erreur redémarrage: ${error.message}`);
            return;
        }

        const updatedGameRoom = syncRoomFromManager(roomId, room.gameType);
        if (updatedGameRoom) {
            rooms.set(roomId, updatedGameRoom);
            io.to(roomId).emit('game:state-update', roomToRoomToSend(updatedGameRoom));
            io.emit('room:list', getAllRoomsToSend());
        }
    });

    // --- GESTION UNIVERSELLE DU CHAT (Le Canal Zoizos) ---
    socket.on('chat:send-message', (message: any) => {
        const messageWithTime = {
            ...message,
            timestamp: Date.now()
        };
        io.to(message.roomId).emit('chat:message', messageWithTime);
    });
});

// --- Lancement du serveur ---
httpServer.listen(PORT, () => {
    console.log(`[SERVER] L'Arbre des Jeux est enraciné sur le port ${PORT}`);
    console.log(`[SERVER] Accès à la canopée via http://localhost:${PORT}`);
});