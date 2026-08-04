// src/server/server.ts

// Ce fichier gère la logique principale du serveur Socket.IO et la délégation aux gestionnaires de jeu.

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

import { CrazyMorpionSymbol, CrazyMorpionGrid } from '@ilot/shared-core';
import { CrazyMorpionManager } from '../games/crazymorpion/CrazyMorpionManager';
import { KoOonTreeZManager } from '../games/kooontreez/KoOonTreeZManager';
import { AtomikKFardEManager } from '../games/atomik-k-far/Atomik-K-FarManager'; // Corrigé (majuscule)

import { CrazyMorpionGameRoom as ManagerCrazyMorpionGameRoom } from '@ilot/shared-core';
import { KoOonTreeZGameRoom as ManagerKoOonTreeZGameRoom, KoOonTreeZPlayer } from '@ilot/shared-core';
import { AtomikKFardEGameRoom as ManagerAtomikKFardEGameRoom, Player as AtomikPlayer } from '@ilot/shared-core';

import {
    BaseMakeMoveRequest,
    CrazyMorpionMakeMoveRequest,
    KoOonTreeZMakeMoveRequest,
    AtomikKFardEMakeMoveRequest,
    RoomToSend,
    CreateRoomRequest,
    ChatMessage,
    PlayerInRoom,
    GameType,
    CrazyMorpionPlayerClient,
    KoOonTreeZPlayerClient,
    AtomikKFardEGameOptions
} from '@ilot/shared-core';

import {
    KoOonTreezNbPlayer,
    KoOonTreezMode,
    KoOonTreezOption,
    KoOonTreezLevel,
    KoOonTreezSoloMode,
    CurrentFlag
} from '@ilot/shared-core';
import { Player, 
        AtomikKFardEGameRoom,
        AtomikKFardEPlayer,
        AtomikKFardENbPlayer,
        AtomikKFardEMode, 
        AtomikKFardEOption, 
        AtomikKFardEStyle  } from '@ilot/shared-core';

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

// --- Interfaces des salons de jeu ---
interface BaseServerRoom {
    id: string;
    name: string;
    players: PlayerInRoom[]; 
    state: 'waiting' | 'playing' | 'gameOver' | 'paused' | 'readyToStart' | 'empty';
    winnerId: string | null;
    round: number;
    chatMessages: ChatMessage[];
    gameType: GameType;
    maxPlayers: number;
    scores: { [playerId: string]: number };
}

interface ServerCrazyMorpionRoom extends BaseServerRoom {
    gameType: 'CrazyMorpion';
    grid: CrazyMorpionGrid;
    winningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null;
    currentTurnPlayerId: string | null;
}

interface ServerKoOonTreeZRoom extends BaseServerRoom {
    gameType: 'KoOonTreeZ';
    kooonTreezNbPlayer?: KoOonTreezNbPlayer;
    kooonTreezMode?: KoOonTreezMode;
    kooonTreezOption?: KoOonTreezOption;
    kooonTreezLevel?: KoOonTreezLevel;
    kooonTreezSoloMode?: KoOonTreezSoloMode;
    currentRoundTimeLeft?: number;
    totalFlagsRecognized?: number;
    targetFlagsCount?: number | 'abandon';
    currentFlag?: CurrentFlag | null;
}

interface ServerAtomikKFardERoom extends ManagerAtomikKFardEGameRoom {
    gameType: 'AtomikKFardE';
    players: AtomikKFardEPlayer[]; // <--- Utilise AtomikKFardEPlayer[] au lieu de Player[]
    atomikKfardEOptions?: AtomikKFardEGameOptions;
}


type ServerGameRoom = ServerCrazyMorpionRoom | ServerKoOonTreeZRoom | ServerServerAtomikRoomHelper;
type ServerServerAtomikRoomHelper = ServerAtomikKFardERoom;

const rooms: Map<string, ServerGameRoom> = new Map();
const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
const playerRooms: Map<string, string> = new Map();

const ROOM_DELETION_GRACE_PERIOD_MS = 10000;

const crazyMorpionManager = new CrazyMorpionManager(io);
const koOonTreeZManager = new KoOonTreeZManager(io);
const atomikKFardEManager = new AtomikKFardEManager(io); // Corrigé (nom de classe avec majuscule)

function roomToRoomToSend(room: ServerGameRoom, requestingPlayerId?: string): RoomToSend {
    if (room.gameType === 'AtomikKFardE') {
        return atomikKFardEManager.toClientRoom(room as AtomikKFardEGameRoom);
    }

    const playersToSend = room.players.map(p => {
        if (room.gameType === 'CrazyMorpion') {
            const crazyMorpionPlayer = p as ServerCrazyMorpionRoom['players'][number];
            return {
                id: crazyMorpionPlayer.id,
                username: crazyMorpionPlayer.username,
                symbol: crazyMorpionPlayer.symbol,
                score: crazyMorpionPlayer.score,
                roomId: crazyMorpionPlayer.roomId,
                status: crazyMorpionPlayer.status,
            } as CrazyMorpionPlayerClient;
        } else if (room.gameType === 'KoOonTreeZ') {
            const koOonTreeZPlayer = p as ServerKoOonTreeZRoom['players'][number];
            return {
                id: koOonTreeZPlayer.id,
                username: koOonTreeZPlayer.username,
                score: koOonTreeZPlayer.score,
                roomId: koOonTreeZPlayer.roomId,
                status: koOonTreeZPlayer.status,
            } as KoOonTreeZPlayerClient;
        }
        return { id: p.id, username: p.username, score: p.score, roomId: p.roomId, status: p.status } as PlayerInRoom;
    });

    if (room.gameType === 'CrazyMorpion') {
        const crazyMorpionRoom = room as ServerCrazyMorpionRoom;
        return {
            id: crazyMorpionRoom.id,
            name: crazyMorpionRoom.name,
            gameType: crazyMorpionRoom.gameType,
            scores: crazyMorpionRoom.scores || {},
            players: playersToSend as CrazyMorpionPlayerClient[],
            state: crazyMorpionRoom.state,
            winnerId: crazyMorpionRoom.winnerId,
            round: crazyMorpionRoom.round,
            maxPlayers: crazyMorpionRoom.maxPlayers,
            chatMessages: crazyMorpionRoom.chatMessages,
            grid: crazyMorpionRoom.grid,
            winningCells: crazyMorpionRoom.winningCells,
            currentTurnPlayerId: crazyMorpionRoom.currentTurnPlayerId,
        } as RoomToSend;
    } else if (room.gameType === 'KoOonTreeZ') {
        const koOonTreeZRoom = room as ServerKoOonTreeZRoom;
        return {
            id: koOonTreeZRoom.id,
            name: koOonTreeZRoom.name,
            gameType: koOonTreeZRoom.gameType,
            scores: koOonTreeZRoom.scores || {},
            players: playersToSend as KoOonTreeZPlayerClient[],
            state: koOonTreeZRoom.state,
            winnerId: koOonTreeZRoom.winnerId,
            round: koOonTreeZRoom.round,
            maxPlayers: koOonTreeZRoom.maxPlayers,
            chatMessages: koOonTreeZRoom.chatMessages,
            kooonTreezNbPlayer: koOonTreeZRoom.kooonTreezNbPlayer,
            kooonTreezMode: koOonTreeZRoom.kooonTreezMode,
            kooonTreezOption: koOonTreeZRoom.kooonTreezOption,
            kooonTreezLevel: koOonTreeZRoom.kooonTreezLevel,
            currentRoundTimeLeft: koOonTreeZRoom.currentRoundTimeLeft,
            totalFlagsRecognized: koOonTreeZRoom.totalFlagsRecognized,
            targetFlagsCount: koOonTreeZRoom.targetFlagsCount,
            currentFlag: koOonTreeZRoom.currentFlag,
        } as RoomToSend;
    }

    throw new Error(`Type de jeu inconnu lors de la conversion du salon pour l'envoi au client.`);
}

function getAllRoomsToSend(): RoomToSend[] {
    return Array.from(rooms.values())
        .filter(room => !disconnectTimers.has(room.id)) 
        .map(room => roomToRoomToSend(room));
}

// --- Logique du serveur Socket.IO ---
io.on('connection', (socket: Socket) => {
    console.log(`[SERVER] Utilisateur connecté: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`[SERVER] Joueur déconnecté: ${socket.id}`);
        
        const disconnectedRoomId = playerRooms.get(socket.id);
        
        if (disconnectedRoomId) {
            const room = rooms.get(disconnectedRoomId);
            if (!room) return;

            if (room.gameType === 'CrazyMorpion') {
                crazyMorpionManager.notifyPlayerDisconnect(socket.id, room.id);
            } else if (room.gameType === 'KoOonTreeZ') {
                koOonTreeZManager.notifyPlayerDisconnect(socket.id, room.id);
            } else if (room.gameType === 'AtomikKFardE') {
                atomikKFardEManager.notifyPlayerDisconnect(socket.id, room.id);
            }

            let updatedRoomFromManager: ServerGameRoom | undefined;
            
            if (room.gameType === 'CrazyMorpion') {
                const roomFromManager = crazyMorpionManager.getRoom(room.id);
                if (roomFromManager) updatedRoomFromManager = { ...roomFromManager, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
            } else if (room.gameType === 'KoOonTreeZ') {
                const roomFromManager = koOonTreeZManager.getRoom(room.id);
                if (roomFromManager) updatedRoomFromManager = { ...roomFromManager, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
            } else if (room.gameType === 'AtomikKFardE') {
                const roomFromManager = atomikKFardEManager.getRoom(room.id);
                if (roomFromManager) updatedRoomFromManager = { ...roomFromManager, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
            }

            if (updatedRoomFromManager) {
                rooms.set(room.id, updatedRoomFromManager);
            }

            const allPlayersEffectivelyDisconnected = updatedRoomFromManager?.players.every(p => {
                if (updatedRoomFromManager?.gameType === 'AtomikKFardE') {
                    const atomikPlayer = (updatedRoomFromManager as ServerAtomikKFardERoom).players.find(ap => ap.id === p.id) as AtomikPlayer;
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
                    const playersStillDisconnected = finalRoomState?.players.every(p => {
                        if (finalRoomState.gameType === 'AtomikKFardE') {
                            const atomikPlayer = (finalRoomState as ServerAtomikKFardERoom).players.find(ap => ap.id === p.id) as AtomikPlayer;
                            return atomikPlayer && atomikPlayer.status === 'disconnected';
                        }
                        return p.status === 'disconnected';
                    }) || false;

                    if (finalRoomState && playersStillDisconnected) {
                        rooms.delete(room.id);
                        disconnectTimers.delete(room.id);
                        if (room.gameType === 'CrazyMorpion') crazyMorpionManager.deleteRoom(room.id);
                        else if (room.gameType === 'KoOonTreeZ') koOonTreeZManager.deleteRoom(room.id);
                        else if (room.gameType === 'AtomikKFardE') atomikKFardEManager.deleteRoom(room.id);
                        
                        io.emit('room:list', getAllRoomsToSend());
                    }
                }, ROOM_DELETION_GRACE_PERIOD_MS);
                disconnectTimers.set(room.id, timer);
            } else {
                io.emit('room:list', getAllRoomsToSend());
            }
            
            playerRooms.delete(socket.id);
        }
    });

    socket.on('room:create', (payload: CreateRoomRequest & { 
        atomikKFardENbPlayer?: AtomikKFardENbPlayer; 
        atomikKFardEMode?: AtomikKFardEMode; 
        atomikKFardEOption?: AtomikKFardEOption; 
        atomikKFardEGameStyle?: AtomikKFardEStyle; 
    }) => {
        const { username, roomName, gameType, kooonTreezNbPlayer, kooonTreezMode, kooonTreezOption, kooonTreezLevel, kooonTreezSoloMode, atomikKFardENbPlayer, atomikKFardEMode, atomikKFardEOption, atomikKFardEGameStyle } = payload;
        const roomId = Date.now().toString();
        let newRoomServer: ServerGameRoom | null = null;
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
            if (gameType === 'CrazyMorpion') {
                const crazyMorpionCreatorPlayer: ManagerCrazyMorpionGameRoom['players'][number] = {
                    id: ownerPlayerId, username, socketId: socket.id, score: 0, roomId, status: 'connected', isReady: false, symbol: '' as CrazyMorpionSymbol
                };
                const roomFromManager = crazyMorpionManager.createRoom(roomId, roomName || `Salon de ${username}`, crazyMorpionCreatorPlayer);
                newRoomServer = { ...roomFromManager, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
                roomToSendToClient = roomToRoomToSend(newRoomServer);
            } else if (gameType === 'KoOonTreeZ') {
                const koOonTreeZOptions = { 
                    kooonTreezNbPlayer: kooonTreezNbPlayer || 'duo', 
                    kooonTreezMode: kooonTreezMode || 'DvsP', 
                    kooonTreezOption: kooonTreezOption || 'Champ-De-Bataille', 
                    kooonTreezLevel: kooonTreezLevel || 'easy', 
                    kooonTreezSoloMode: (kooonTreezSoloMode as KoOonTreezSoloMode) || 'training' 
                };
                const koOonTreeZCreatorPlayer: KoOonTreeZPlayer = { id: ownerPlayerId, username, socketId: socket.id, score: 0, roomId, status: 'connected', isReady: false };
                const roomFromManager = koOonTreeZManager.createRoom(roomId, roomName || `Salon de ${username}`, koOonTreeZCreatorPlayer, koOonTreeZOptions);
                newRoomServer = { ...roomFromManager, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
                roomToSendToClient = roomToRoomToSend(newRoomServer);
            } else if (gameType === 'AtomikKFardE') {
                const roomFromManager = atomikKFardEManager.createRoom(roomId, roomName || `Salon de ${username}`, ownerPlayerId, username, socket.id, atomikKFardEOptions);
                newRoomServer = { ...roomFromManager, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
                roomToSendToClient = atomikKFardEManager.toClientRoom(newRoomServer as AtomikKFardEGameRoom);
            } else {
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
            socket.emit('error:message', 'Ce salon n\'existe pas.');
            return;
        }

        if (disconnectTimers.has(roomId)) {
            clearTimeout(disconnectTimers.get(roomId)!);
            disconnectTimers.delete(roomId);
        }

        socket.join(roomId);
        playerRooms.set(socket.id, roomId);

        let updatedGameRoom: ServerGameRoom | undefined;
        if (room.gameType === 'CrazyMorpion') {
            const roomFromManager = crazyMorpionManager.handlePlayerJoin(roomId, username, socket.id);
            if (roomFromManager) updatedGameRoom = { ...roomFromManager, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
        } else if (room.gameType === 'KoOonTreeZ') {
            const roomFromManager = koOonTreeZManager.handlePlayerJoin(roomId, username, socket.id);
            if (roomFromManager) updatedGameRoom = { ...roomFromManager, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
        } else if (room.gameType === 'AtomikKFardE') {
            const roomFromManager = atomikKFardEManager.handlePlayerJoin(roomId, username, socket.id);
            if (roomFromManager) updatedGameRoom = { ...roomFromManager, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
        }

        if (updatedGameRoom) {
            rooms.set(roomId, updatedGameRoom);
            io.to(roomId).emit('room:updated', roomToRoomToSend(updatedGameRoom));
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

        if (room.gameType === 'CrazyMorpion') crazyMorpionManager.notifyPlayerDisconnect(socket.id, room.id);
        else if (room.gameType === 'KoOonTreeZ') koOonTreeZManager.notifyPlayerDisconnect(socket.id, room.id);
        else if (room.gameType === 'AtomikKFardE') atomikKFardEManager.notifyPlayerDisconnect(socket.id, room.id);

        let updatedRoomFromManager: ServerGameRoom | undefined;
        if (room.gameType === 'CrazyMorpion') {
            const rf = crazyMorpionManager.getRoom(room.id);
            if (rf) updatedRoomFromManager = { ...rf, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
        } else if (room.gameType === 'KoOonTreeZ') {
            const rf = koOonTreeZManager.getRoom(room.id);
            if (rf) updatedRoomFromManager = { ...rf, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
        } else if (room.gameType === 'AtomikKFardE') {
            const rf = atomikKFardEManager.getRoom(room.id);
            if (rf) updatedRoomFromManager = { ...rf, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
        }

        if (updatedRoomFromManager) {
            rooms.set(roomId, updatedRoomFromManager);
            io.to(roomId).emit('room:updated', roomToRoomToSend(updatedRoomFromManager));
        }
        io.emit('room:list', getAllRoomsToSend());
    });

    socket.on('game:make-move', (data: BaseMakeMoveRequest) => {
        const room = rooms.get(data.roomId);
        if (!room) return socket.emit('error:message', 'Salon non trouvé.');

        let updatedGameRoom: ServerGameRoom | undefined;

        try {
            if (data.gameType === 'CrazyMorpion' && room.gameType === 'CrazyMorpion') {
                const cmData = data as CrazyMorpionMakeMoveRequest;
                crazyMorpionManager.handleMakeMove(cmData.roomId, cmData.playerId, cmData.x, cmData.y, cmData.chosenSymbol);
                const rf = crazyMorpionManager.getRoom(cmData.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
            } else if (data.gameType === 'KoOonTreeZ' && room.gameType === 'KoOonTreeZ') {
                const ktData = data as KoOonTreeZMakeMoveRequest;
                koOonTreeZManager.handleSubmitAnswer(ktData.roomId, ktData.playerId, ktData.answer);
                const rf = koOonTreeZManager.getRoom(ktData.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
            } else if (data.gameType === 'AtomikKFardE' && room.gameType === 'AtomikKFardE') {
                const akData = data as AtomikKFardEMakeMoveRequest;
                atomikKFardEManager.handleMakeMove(akData.roomId, akData.playerId, akData.action);
                const rf = atomikKFardEManager.getRoom(akData.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
            }
        } catch (error: any) {
            socket.emit('error:message', `Action invalide: ${error.message}`);
            return;
        }

        if (updatedGameRoom) {
            rooms.set(updatedGameRoom.id, updatedGameRoom);
            io.to(updatedGameRoom.id).emit('game:state-update', roomToRoomToSend(updatedGameRoom));
            io.emit('room:list', getAllRoomsToSend());
        }
    });

    socket.on('kooontreez:start-game', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room?.gameType === 'KoOonTreeZ') {
            koOonTreeZManager.startGame(roomId);
            const rf = koOonTreeZManager.getRoom(roomId);
            if (rf) {
                rooms.set(roomId, { ...rf, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom);
                io.to(roomId).emit('game:state-update', roomToRoomToSend(rooms.get(roomId)!));
                io.emit('room:list', getAllRoomsToSend());
            }
        }
    });

    socket.on('atomikkfarde:start-game', ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (room?.gameType === 'AtomikKFardE') {
            try {
                atomikKFardEManager.startGame(room);
                const rf = atomikKFardEManager.getRoom(roomId);
                if (rf) {
                    rooms.set(roomId, { ...rf, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom);
                    io.to(roomId).emit('game:state-update', roomToRoomToSend(rooms.get(roomId)!));
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

        let updatedGameRoom: ServerGameRoom | undefined;

        try {
            if (room.gameType === 'CrazyMorpion') {
                crazyMorpionManager.handleRestartRequest(roomId, socket.id);
                const rf = crazyMorpionManager.getRoom(roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
            } else if (room.gameType === 'KoOonTreeZ') {
                koOonTreeZManager.handleRestartRequest(roomId, socket.id);
                const rf = koOonTreeZManager.getRoom(roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
            } else if (room.gameType === 'AtomikKFardE') {
                atomikKFardEManager.handleRestartRequest(roomId, socket.id);
                const rf = atomikKFardEManager.getRoom(roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
            }
        } catch (error: any) {
            socket.emit('error:message', `Erreur redémarrage: ${error.message}`);
            return;
        }

        if (updatedGameRoom) {
            rooms.set(roomId, updatedGameRoom);
            io.to(roomId).emit('game:state-update', roomToRoomToSend(updatedGameRoom));
            io.emit('room:list', getAllRoomsToSend());
        }
    });

    socket.on('chat:send-message', (message: ChatMessage) => {
        const room = rooms.get(message.roomId);
        if (!room) return;

        let updatedGameRoom: ServerGameRoom | undefined;

        try {
            if (room.gameType === 'CrazyMorpion') {
                crazyMorpionManager.handleChatMessage(message);
                const rf = crazyMorpionManager.getRoom(message.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'CrazyMorpion' } as ServerCrazyMorpionRoom;
            } else if (room.gameType === 'KoOonTreeZ') {
                koOonTreeZManager.handleChatMessage(message);
                const rf = koOonTreeZManager.getRoom(message.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'KoOonTreeZ' } as ServerKoOonTreeZRoom;
            } else if (room.gameType === 'AtomikKFardE') {
                atomikKFardEManager.handleChatMessage(message);
                const rf = atomikKFardEManager.getRoom(message.roomId);
                if (rf) updatedGameRoom = { ...rf, gameType: 'AtomikKFardE' } as ServerAtomikKFardERoom;
            }
        } catch (error: any) {
            socket.emit('error:message', `Erreur chat: ${error.message}`);
            return;
        }

        if (updatedGameRoom) {
            rooms.set(message.roomId, updatedGameRoom);
            io.to(message.roomId).emit('game:state-update', roomToRoomToSend(updatedGameRoom));
        }
    });
});

// --- Lancement du serveur ---
httpServer.listen(PORT, () => {
    console.log(`[SERVER] L'Arbre des Jeux est enraciné sur le port ${PORT}`);
    console.log(`[SERVER] Accès à la canopée via http://localhost:${PORT}`);
});