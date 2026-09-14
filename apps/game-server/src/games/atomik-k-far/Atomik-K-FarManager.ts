// Ce fichier gère la logique et l'état des parties d'Atomik-K-Fard(e).
import { Server } from 'socket.io';
import {
    AtomikGrid, AtomikCard, AtomikKFardEMode, AtomikKFardEOption, AtomikKFardENbPlayer, AtomikKFardEStyle, CellOwner,
    AtomikKFardEGameRoom, ConquestRoundResult, CellCoordinates, AtomikTimePerRound, AtomikKFardETeamMode, PlayerAction,
    AtomikKFardEPlayer, 
    GridCell
} from "@ilot/shared-core";
import { AtomikKFardELogic } from "@ilot/shared-core";
import { AtomikKFardEPlayerClient, RoomToSend, AtomikKFardERoomToSend, AtomikKFardEGameOptions } from '@ilot/shared-core';
import { Socket } from 'socket.io-client';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE ET DE L'ORCHESTRATEUR DE PARIS
import { GameStatsService } from '@ilot/infrastructure'; 
import { BettingOrchestrator } from '@ilot/shared-core';

const MAX_PLAYERS_PER_ROOM = 2;
const PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS = 1000;
const ROUND_DURATION_SECONDS = 60; // Durée par défaut d'un round en secondes

/**
 * @class AtomikKFardEManager
 * @description Gère l'état et la logique du jeu Atomik-K-Fard(e) pour une salle de jeu donnée.
 * Cette classe est responsable de la création, de la mise à jour et de la progression des parties.
 */
export class AtomikKFardEManager {
    private io: Server;
    private rooms: Map<string, AtomikKFardEGameRoom>;
    private gameLogics: Map<string, AtomikKFardELogic>;

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        this.rooms = new Map();
        this.gameLogics = new Map();
    }

    /**
     * @function createRoom
     * @description Crée une nouvelle salle de jeu Atomik K Fard(E) avec support des paris sous séquestre.
     */
    public createRoom(
        roomId: string,
        roomName: string,
        ownerId: string,
        ownerUsername: string,
        ownerSocketId: string,
        gameOptions: AtomikKFardEGameOptions & { wagerAmount?: number; wagerCurrency?: string; gameMode?: string; difficulty?: string }
    ): AtomikKFardEGameRoom {
        if (this.rooms.has(roomId)) {
            console.error(`[AtomikKFardEManager] Erreur: Une salle avec l'ID '${roomId}' existe déjà.`);
            throw new Error(`Une salle avec l'ID '${roomId}' existe déjà.`);
        }

        const ownerPlayer: AtomikKFardEPlayerClient = {
            id: ownerId,
            roomId: roomId,
            username: ownerUsername,
            socketId: ownerSocketId,
            isReady: false,
            score: 0,
            status: 'connected',
            gameType: 'AtomikKFardE',
            hand: [],
            deck: [],
            isConnected: true,
            handSize: 0
        };

        let maxPlayers: number;
        switch (gameOptions.nbPlayer) {
            case 'duo':
                maxPlayers = 2;
                break;
            case '2vs2':
                maxPlayers = 4;
                break;
            default:
                console.warn(`[AtomikKFardEManager] Nombre de joueurs inattendu: ${gameOptions.nbPlayer}. Défaut à 2.`);
                maxPlayers = 2;
                break;
        }

        const initialPlayerGrids: { [playerId: string]: GridCell[][] } = {
            [ownerPlayer.id]: AtomikKFardELogic.createEmptyAtomikKFardEGrid(gameOptions.option)
        };

        const newRoom: AtomikKFardEGameRoom = {
            id: roomId,
            ownerId: ownerPlayer.id,
            name: roomName,
            players: [ownerPlayer],
            state: 'waitingForPlayers',
            winnerId: null,
            currentRound: 0,
            maxRounds: gameOptions.maxRounds,
            currentPlayerTurn: '',
            roundTimerInterval: null,
            timePerRound: gameOptions.timePerRound,
            currentRoundTimer: null,
            currentRoundTimeLeft: gameOptions.timePerRound,
            gameType: 'AtomikKFardE',
            maxPlayers: maxPlayers,
            gameOptions: gameOptions,
            deck: [],
            discardPile: [],
            grid: [],
            playerGrids: initialPlayerGrids,
            scores: { [ownerPlayer.id]: 0 },
            team1Players: [],
            team2Players: [],
            team1Score: 0,
            team2Score: 0,
            team1ControlledCellsTotal: 0,
            team2ControlledCellsTotal: 0,
            roundResults: [],
            playerStates: {
                [ownerPlayer.id]: {
                    playedCard: null,
                    hasPlayedThisRound: false,
                    playedCoordinates: null,
                    submittedGrid: AtomikKFardELogic.createEmptyAtomikKFardEGrid(gameOptions.option),
                    hasSubmitted: false
                }
            },
            teams: { player1: [], player2: [] },
            bombPropagationOrigin: null,
            cafardBombPlayer1PropagationOrigin: null,
            cafardBombPlayer2PropagationOrigin: null,
            turnPassTimer: null,
            playerDisconnectTimers: new Map(),
            gameHistory: [],
            connectedPlayersCount: [ownerPlayer.id].length,
            wagerAmount: gameOptions.wagerAmount || 0,
            wagerCurrency: gameOptions.wagerCurrency || 'DHO',
            round: 0,
            currentBoardState: [],
            player1Hand: [],
            player2Hand: []
        };

        newRoom.connectedPlayersCount = newRoom.players.length;

        this.rooms.set(roomId, newRoom);
        console.log(`[AtomikKFardEManager] Salle '${roomId}' nommée '${roomName}' créée par ${ownerPlayer.username} (${ownerPlayer.id}).`);

        return newRoom;
    }

    public toClientRoom(room: AtomikKFardEGameRoom): AtomikKFardERoomToSend {
        const playersToSend: AtomikKFardEPlayerClient[] = room.players.map(p => ({
            hand: p.hand!,
            id: p.id,
            socketId: p.socketId,
            username: p.username,
            score: p.score,
            roomId: room.id!,
            status: p.isConnected ? 'connected' : 'disconnected',
            isReady: p.isReady,
            handSize: p.hand?.length || 0,
            deck: p.deck!
        }));

        const player1 = room.players[0];
        const player2 = room.players[1];

        return {
            bombPropagationOrigin: room.bombPropagationOrigin,
            cafardBombPlayer1PropagationOrigin: room.cafardBombPlayer1PropagationOrigin,
            cafardBombPlayer2PropagationOrigin: room.cafardBombPlayer2PropagationOrigin,
            playerDisconnectTimers: room.playerDisconnectTimers,
            gameHistory: room.gameHistory,
            playerStates: room.playerStates,
            roundResults: room.roundResults,
            teams: room.teams,
            team1Players: room.team1Players,
            team2Players: room.team2Players,
            team1Score: room.team1Score,
            team2Score: room.team2Score,
            playerGrids: room.playerGrids,
            discardPile: room.discardPile,
            currentRoundTimer: room.currentRoundTimer,
            timePerRound: room.timePerRound,
            roundTimerInterval: room.roundTimerInterval,
            currentPlayerTurn: room.currentPlayerTurn,
            ownerId: room.ownerId,
            id: room.id,
            name: room.name,
            gameType: 'AtomikKFardE',
            players: playersToSend,
            state: room.state,
            winnerId: room.winnerId,
            deck: room.deck,
            gameOptions: {
                option: room.gameOptions.option,
                mode: room.gameOptions.mode,
                gameStyle: room.gameOptions.gameStyle,
                teamMode: room.gameOptions.teamMode,
                nbPlayer: room.gameOptions.nbPlayer,
                maxRounds: room.gameOptions.maxRounds,
                timePerRound: room.gameOptions.timePerRound,
                scoreToWin: room.gameOptions.scoreToWin
            },
            grid: room.grid,
            currentBoardState: room.grid,
            currentRound: room.currentRound,
            maxRounds: room.maxRounds,
            round: room.currentRound,
            maxPlayers: room.maxPlayers,
            scores: room.scores,
            player1Hand: player1 ? player1.hand! : [],
            player2Hand: player2 ? player2.hand! : [],
            team1ControlledCellsTotal: room.team1ControlledCellsTotal,
            team2ControlledCellsTotal: room.team2ControlledCellsTotal,
            currentRoundTimeLeft: room.currentRoundTimeLeft,
            wagerAmount: room.wagerAmount,
            wagerCurrency: room.wagerCurrency
        };
    }

    public addPlayerToRoom(room: AtomikKFardEGameRoom, playerId: string, username: string): AtomikKFardEGameRoom {
        if (room.players.length >= room.maxPlayers) {
            throw new Error(`La salle ${room.id} est déjà pleine.`);
        }
        if (room.players.some(p => p.id === playerId)) {
            throw new Error(`Le joueur ${playerId} est déjà dans la salle ${room.id}.`);
        }

        const newPlayer: AtomikKFardEPlayerClient = {
            gameType: 'AtomikKFardE',
            roomId: room.id,
            status: 'connected',
            id: playerId,
            socketId: '',
            username: username,
            hand: [],
            deck: [],
            score: 0,
            isConnected: true,
            isReady: false,
            handSize: 0
        };

        room.players.push(newPlayer);
        room.playerStates[playerId] = {
            hasPlayedThisRound: false,
            playedCard: null,
            playedCoordinates: null,
            submittedGrid: [],
            hasSubmitted: false
        };
        room.scores[playerId] = 0;

        newPlayer.hand = AtomikKFardELogic.drawNewHand([], newPlayer.deck!, [], []);

        if (room.maxPlayers === 2 && room.teams.player2.length === 0) {
            room.teams.player2.push(playerId);
        } else if (room.maxPlayers > 2) {
            if (room.teams.player1.length <= room.teams.player2.length) {
                room.teams.player1.push(playerId);
            } else {
                room.teams.player2.push(playerId);
            }
        }

        room.state = room.players.length === room.maxPlayers ? 'readyToStart' : 'waitingForPlayers';
        return room;
    }

    public deleteRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            if (room.roundTimerInterval) {
                clearInterval(room.roundTimerInterval);
                room.roundTimerInterval = null;
            }
            room.playerDisconnectTimers.forEach(timer => clearTimeout(timer));
            room.playerDisconnectTimers.clear();

            this.rooms.delete(roomId);
            this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r)));
        }
    }

    public playerReady(room: AtomikKFardEGameRoom, playerId: string, isReady: boolean): AtomikKFardEGameRoom {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.isReady = isReady;
        }

        const allPlayersReady = room.players.length === room.maxPlayers && room.players.every(p => p.isReady);
        if (allPlayersReady && room.state === 'readyToStart') {
            room.state = 'inGame';
            room.currentRound = 1;
            room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);
            room.currentPlayerTurn = room.players[0].id;
            for (const pId in room.playerStates) {
                room.playerStates[pId] = { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false };
            }
            this.startRound(room.id);
        }
        return room;
    }

    public playCard(room: AtomikKFardEGameRoom, playerId: string, card: AtomikCard, coordinates: CellCoordinates): AtomikKFardEGameRoom {
        if (room.state !== 'inGame') {
            throw new Error("Le jeu n'est pas en cours.");
        }
        if (room.currentPlayerTurn !== playerId) {
            throw new Error(`Ce n'est pas le tour du joueur ${playerId}.`);
        }

        const player = room.players.find(p => p.id === playerId);
        const playerState = room.playerStates[playerId];

        if (!player || !playerState) {
            throw new Error(`Joueur ${playerId} non trouvé.`);
        }
        if (!player.hand!.some(c => c.id === card.id)) {
            throw new Error(`La carte ${card.id} n'est pas dans la main du joueur ${playerId}.`);
        }

        const { r, c } = coordinates;
        if (!room.grid[r] || !room.grid[r][c]) {
            throw new Error(`Coordonnées de grille invalides: (${r}, ${c}).`);
        }

        if (playerState.hasPlayedThisRound) {
            throw new Error(`Le joueur ${playerId} a déjà joué ce tour.`);
        }

        playerState.hasPlayedThisRound = true;
        playerState.playedCard = card;
        playerState.playedCoordinates = coordinates;

        if (!room.playerGrids[playerId]) {
            room.playerGrids[playerId] = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);
        }
        room.playerGrids[playerId][r][c].card = card;

        player.hand = player.hand!.filter(c => c.id !== card.id);

        this.moveToNextPlayerTurn(room);

        const allPlayersPlayed = room.players.every(p => room.playerStates[p.id]?.hasPlayedThisRound);
        if (allPlayersPlayed) {
            this.resolveCurrentRound(room);
        }

        return room;
    }

    public handlePlayerJoin(roomId: string, username: string, socketId: string): AtomikKFardEGameRoom {
        let room = this.rooms.get(roomId);

        if (!room) {
            const defaultGameOptions = {
                nbPlayer: 'duo' as AtomikKFardENbPlayer,
                mode: 'Stratege' as AtomikKFardEMode,
                option: 'Sonic' as AtomikKFardEOption,
                teamMode: 'Random' as AtomikKFardETeamMode,
                gameStyle: 'Conquête' as AtomikKFardEStyle,
                timePerRound: 60 as AtomikTimePerRound,
                maxRounds: 10,
                scoreToWin: 100,
            };
            room = {
                id: roomId,
                ownerId: '',
                name: `Salle de ${username}`,
                players: [],
                state: 'waitingForPlayers',
                winnerId: null,
                currentRound: 0,
                maxRounds: defaultGameOptions.maxRounds,
                currentPlayerTurn: '',
                roundTimerInterval: null,
                timePerRound: defaultGameOptions.timePerRound!,
                currentRoundTimer: null,
                currentRoundTimeLeft: defaultGameOptions.timePerRound! / 1000,
                gameType: 'AtomikKFardE',
                maxPlayers: MAX_PLAYERS_PER_ROOM,
                gameOptions: defaultGameOptions,
                deck: [],
                discardPile: [],
                grid: [],
                playerGrids: {},
                scores: {},
                team1Players: [],
                team2Players: [],
                team1Score: 0,
                team2Score: 0,
                team1ControlledCellsTotal: 0,
                team2ControlledCellsTotal: 0,
                roundResults: [],
                playerStates: {},
                teams: { player1: [], player2: [] },
                bombPropagationOrigin: null,
                cafardBombPlayer1PropagationOrigin: null,
                cafardBombPlayer2PropagationOrigin: null,
                turnPassTimer: null,
                playerDisconnectTimers: new Map(),
                gameHistory: [],
                wagerAmount: 0,
                wagerCurrency: 'DHO',
                round: 0,
                currentBoardState: [],
                player1Hand: [],
                player2Hand: []
            };
            this.rooms.set(roomId, room!);
        }

        const existingPlayer = room!.players.find(p => p.socketId === socketId);
        if (existingPlayer) {
            return room!;
        }

        if (room!.players.length >= room!.maxPlayers) {
            throw new Error(`La salle '${roomId}' est pleine. Impossible de rejoindre.`);
        }

        const newPlayer: AtomikKFardEPlayerClient = {
            gameType: 'AtomikKFardE',
            id: `player-${socketId}`,
            username: username,
            socketId: socketId,
            roomId: roomId,
            status: 'connected',
            hand: [],
            deck: [],
            score: 0,
            isConnected: true,
            isReady: false,
            handSize: 0
        };
        room!.players.push(newPlayer);

        if (room!.players.length === room!.maxPlayers) {
            this.startGame(room!);
        }

        return room!;
    }

    public handlePlayerLeave(socketId: string): string | null {
        for (const [roomId, room] of this.rooms.entries()) {
            const initialPlayerCount = room.players.length;
            room.players = room.players.filter(p => p.socketId !== socketId);

            if (room.players.length < initialPlayerCount) {
                if (room.players.length === 0) {
                    this.rooms.delete(roomId);
                }
                return roomId;
            }
        }
        return null;
    }

    public startGame(room: AtomikKFardEGameRoom): void {
        room.deck = AtomikKFardELogic.generateFullDeck(room.gameOptions.mode, room.gameOptions.option);
        room.deck = AtomikKFardELogic.shuffleDeck(room.deck);
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);

        room.players.forEach(player => {
            player.hand = AtomikKFardELogic.drawNewHand([], room.deck, [], []);
        });

        room.currentRound = 1;
    }

    private moveToNextPlayerTurn(room: AtomikKFardEGameRoom): void {
        const currentPlayerIndex = room.players.findIndex(p => p.id === room.currentPlayerTurn);
        let nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
        let attempts = 0;
        while (room.playerStates[room.players[nextPlayerIndex].id]?.hasPlayedThisRound && attempts < room.players.length) {
            nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
            attempts++;
        }
        room.currentPlayerTurn = room.players[nextPlayerIndex].id;
    }

    public resolveCurrentRound(room: AtomikKFardEGameRoom): AtomikKFardEGameRoom {
        if (room.state !== 'inGame') {
            throw new Error("Impossible de résoudre le round, le jeu n'est pas en cours.");
        }

        const allPlayersPlayed = room.players.every(p => room.playerStates[p.id]?.hasPlayedThisRound);
        if (!allPlayersPlayed) {
            throw new Error("Tous les joueurs n'ont pas encore soumis leurs cartes pour ce round.");
        }

        let player1CombinedGrid: AtomikGrid;
        let player2CombinedGrid: AtomikGrid;

        if (room.players.length === 2) {
            player1CombinedGrid = room.playerGrids[room.teams.player1[0]];
            player2CombinedGrid = room.playerGrids[room.teams.player2[0]];
        } else {
            const { team1CombinedGrid, team2CombinedGrid } = AtomikKFardELogic.fuseTeamGrids(
                room.playerGrids,
                room.teams.player1,
                room.teams.player2,
                room.gameOptions.option
            );
            player1CombinedGrid = team1CombinedGrid;
            player2CombinedGrid = team2CombinedGrid;
        }

        const roundResult: ConquestRoundResult = AtomikKFardELogic.resolveConquestRound(
            player1CombinedGrid,
            player2CombinedGrid,
            room.gameOptions.option
        );

        room.grid = roundResult.finalBoardState;
        room.roundResults.push(roundResult);

        const p1 = room.players.find(p => p.id === room.teams.player1[0]);
        if (p1) p1.score += roundResult.player1TotalScore;

        const p2 = room.players.find(p => p.id === room.teams.player2[0]);
        if (p2) p2.score += roundResult.player2TotalScore;

        if (room.currentRound >= (room.gameOptions.maxRounds || 10)) {
            room.state = 'gameOver';
            if (p1 && p2) {
                if (p1.score > p2.score) {
                    room.winnerId = p1.id;
                } else if (p2.score > p1.score) {
                    room.winnerId = p2.id;
                } else {
                    room.winnerId = 'tie';
                }
            }
        } else {
            room.currentRound++;
            room.playerGrids = {};
            for (const pId in room.playerStates) {
                room.playerStates[pId] = { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false };
            }
            room.currentPlayerTurn = room.players[0].id;
            this.startRound(room.id);
        }

        return room;
    }

    public getRoom(roomId: string): AtomikKFardEGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public getAllRooms(): AtomikKFardEGameRoom[] {
        return Array.from(this.rooms.values());
    }

    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const playerToDisconnect = room.players.find(p => p.id === socketId);
        if (!playerToDisconnect) return;

        if (playerToDisconnect.status === 'connected') {
            playerToDisconnect.status = 'disconnected_temp';
            const graceTimer = setTimeout(() => {
                const currentRoom = this.rooms.get(roomId);
                if (currentRoom) {
                    const playerStillTempDisconnected = currentRoom.players.find(
                        p => p.username === playerToDisconnect.username && p.status === 'disconnected_temp'
                    );
                    if (playerStillTempDisconnected) {
                        playerStillTempDisconnected.status = 'disconnected';
                    }
                }
                room.playerDisconnectTimers.delete(playerToDisconnect.username);
            }, PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS);

            room.playerDisconnectTimers.set(playerToDisconnect.username, graceTimer);
        }
    }

    public handleRestartRequest(roomId: string, requestingPlayerId: string): AtomikKFardEGameRoom | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        const requestingPlayer = room.players.find(p => p.id === requestingPlayerId && p.status === 'connected');
        if (!requestingPlayer) return undefined;

        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }
        room.playerDisconnectTimers.forEach(timer => clearTimeout(timer));
        room.playerDisconnectTimers.clear();

        const initialGameOptions = { ...room.gameOptions };
        const newDeck = AtomikKFardELogic.shuffleDeck(AtomikKFardELogic.generateFullDeck(initialGameOptions.mode!, initialGameOptions.option!));

        const hostPlayer: AtomikKFardEPlayerClient = {
            gameType: 'AtomikKFardE',
            roomId: roomId,
            status: 'connected',
            socketId: '',
            id: requestingPlayerId,
            username: requestingPlayer.username,
            hand: AtomikKFardELogic.drawNewHand([], newDeck, [], []),
            deck: [],
            score: 0,
            isConnected: true,
            isReady: false,
            handSize: 0
        };

        room.ownerId = requestingPlayerId;
        room.players = [hostPlayer];
        room.state = 'waitingForPlayers';
        room.winnerId = null;
        room.currentRound = 0;
        room.deck = newDeck;
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(initialGameOptions.option!);

        this.io.to(roomId).emit('game:restart', this.toClientRoom(room));
        this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r)));
        return room;
    }

    private startRound(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'inGame') return;

        if (room.currentRound === 0 || room.roundResults.length > 0) {
             room.currentRound++;
        }
        
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }

        for (const pId in room.playerStates) {
            room.playerStates[pId] = { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false };
        }
        room.playerGrids = {};

        room.currentRoundTimeLeft = (room.gameOptions.timePerRound || 30000) / 1000;
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);

        for (const player of room.players) {
            player.hand = AtomikKFardELogic.drawNewHand(player.hand || [], room.deck, [], []);
        }

        room.currentPlayerTurn = room.players[0].id;

        let currentRoundIntervalId: NodeJS.Timeout | null = null;
        currentRoundIntervalId = setInterval(() => {
            const currentRoomInstance = this.rooms.get(roomId);
            if (!currentRoomInstance) {
                if (currentRoundIntervalId !== null) clearInterval(currentRoundIntervalId);
                return;
            }

            currentRoomInstance.currentRoundTimeLeft--;
            this.io.to(roomId).emit('atomikkfarde:countdown', currentRoomInstance.currentRoundTimeLeft);

            if (currentRoomInstance.currentRoundTimeLeft <= 0) {
                this.endRound(roomId);
            }
        }, 1000);

        room.roundTimerInterval = currentRoundIntervalId;

        this.io.to(roomId).emit('game:new-round', this.toClientRoom(room));
        this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r)));
    }

    private startRoundTimer(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.currentRoundTimer) {
            clearInterval(room.currentRoundTimer);
        }

        room.currentRoundTimeLeft = room.gameOptions.timePerRound!;

        room.currentRoundTimer = setInterval(() => {
            room.currentRoundTimeLeft--;
            this.io.to(roomId).emit('atomikkfarde:countdown', room.currentRoundTimeLeft);

            if (room.currentRoundTimeLeft <= 0) {
                clearInterval(room.currentRoundTimer!);
                room.currentRoundTimer = null;
                this.endRound(roomId);
            }
        }, 1000);
    }

    public handleMakeMove(roomId: string, playerId: string, action: PlayerAction): AtomikKFardEGameRoom {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error(`Salle de jeu ${roomId} introuvable.`);
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) throw new Error(`Joueur ${playerId} introuvable.`);

        if (room.state !== 'inGame') throw new Error(`La partie n'est pas en cours.`);

        switch (action.type) {
            case 'playCard':
                const { cardId, r, c } = action.payload;
                const cardIndexInHand = player.hand!.findIndex(card => card.id === cardId);
                if (cardIndexInHand === -1) throw new Error(`Carte introuvable.`);
                
                const cardToPlay = player.hand![cardIndexInHand];
                player.hand!.splice(cardIndexInHand, 1);
                
                room.playerStates[playerId].submittedGrid[r][c] = {
                    ...room.playerStates[playerId].submittedGrid[r][c],
                    card: cardToPlay,
                    owner: player.id === room.team1Players[0] ? CellOwner.Player1 : CellOwner.Player2,
                };
                break;
            default:
                throw new Error(`Type d'action inconnu: ${action.type}`);
        }

        return room;
    }

    private async endRound(roomId: string): Promise<void> {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'inGame') return;

        if (room.currentRoundTimer) {
            clearInterval(room.currentRoundTimer);
            room.currentRoundTimer = null;
        }

        let player1PlayedGrid: AtomikGrid;
        let player2PlayedGrid: AtomikGrid;

        const p1 = room.players[0];
        const p2 = room.players[1];
        if (!p1 || !p2) return;

        player1PlayedGrid = room.playerStates[p1.id].submittedGrid!;
        player2PlayedGrid = room.playerStates[p2.id].submittedGrid!;

        const roundResult = AtomikKFardELogic.resolveConquestRound(
            player1PlayedGrid,
            player2PlayedGrid,
            room.gameOptions.option
        );

        room.grid = roundResult.finalBoardState;
        room.roundResults.push(roundResult);

        room.scores[p1.id] += roundResult.player1TotalScore;
        room.scores[p2.id] += roundResult.player2TotalScore;
        p1.score = room.scores[p1.id];
        p2.score = room.scores[p2.id];

        room.currentRound++;
        
        if (room.currentRound > room.maxRounds || room.scores[p1.id] >= room.gameOptions.scoreToWin || room.scores[p2.id] >= room.gameOptions.scoreToWin) {
            room.state = 'gameOver';
            room.winnerId = this.determineGameWinner(room);

            try {
                const wagerAmt = room.wagerAmount || 0;
                const wagerCur = room.wagerCurrency || 'DHO';
                const difficultyVal = (room.gameOptions as any).difficulty || 'Artisan';
                const modeVal = (room.gameOptions as any).gameMode || 'MULTIPLAYER';

                if (wagerAmt > 0 && room.winnerId && room.winnerId !== 'tie') {
                    const isP1Winner = room.winnerId === p1.id;
                    
                    await BettingOrchestrator.resolveGameAndCalculateCredit(
                        isP1Winner ? p1.id : p2.id,
                        'AtomikKFardE',
                        modeVal,
                        difficultyVal,
                        wagerCur,
                        wagerAmt,
                        true
                    );

                    await BettingOrchestrator.resolveGameAndCalculateCredit(
                        isP1Winner ? p2.id : p1.id,
                        'AtomikKFardE',
                        modeVal,
                        difficultyVal,
                        wagerCur,
                        wagerAmt,
                        false
                    );
                }
            } catch (econErr) {
                console.error(`[AtomikKFardEManager] Erreur lors du calcul KonTraKt pour la salle ${roomId}:`, econErr);
            }

            const duration = (room.gameOptions.timePerRound || 60) * (room.currentRound - 1);
            const matchData = {
                gameType: 'AtomikKFardE' as const,
                roomId: room.id,
                startedAt: new Date(Date.now() - (duration * 1000)),
                endedAt: new Date(),
                durationSeconds: duration,
                players: room.players.map(p => ({
                    uid: p.id,
                    pseudo: p.username,
                    score: room.scores[p.id] || 0,
                    isWinner: room.winnerId === p.id,
                    specificStats: { cardsPlayed: room.currentRound - 1 }
                })),
                matchMetadata: {
                    gridOption: room.gameOptions.option,
                    teamMode: room.gameOptions.teamMode,
                    totalRounds: room.currentRound - 1
                }
            };

            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[AtomikKFardEManager] Historique sauvegardé avec succès pour la salle ${roomId}`);
            });

            this.io.to(roomId).emit('game:over', this.toClientRoom(room));
        } else {
            room.players.forEach(p => {
                room.playerStates[p.id].submittedGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);
                room.playerStates[p.id].hasSubmitted = false;
                p.hand = AtomikKFardELogic.drawNewHand(p.hand!, room.deck, [], []);
            });
            this.startRoundTimer(roomId);
            this.io.to(roomId).emit('game:new-round', this.toClientRoom(room));
        }

        this.io.to(roomId).emit('room:updated', this.toClientRoom(room));
    }

    private determineGameWinner(room: AtomikKFardEGameRoom): string | null {
        const p1 = room.players[0];
        const p2 = room.players[1];
        if (!p1 || !p2) return null;

        if (room.scores[p1.id] > room.scores[p2.id]) return p1.id;
        if (room.scores[p2.id] > room.scores[p1.id]) return p2.id;
        return null;
    }

    public getRoomState(roomId: string): AtomikKFardEGameRoom | undefined {
        return this.rooms.get(roomId);
    }

    public toClientRoomForPlayer(room: AtomikKFardEGameRoom, playerId: string): AtomikKFardERoomToSend {
        const baseClientRoom = this.toClientRoom(room);
        const player = room.players.find(p => p.id === playerId);

        if (player) {
            if (room.players[0]?.id === playerId) {
                baseClientRoom.player1Hand = player.hand!;
            } else if (room.players[1]?.id === playerId) {
                baseClientRoom.player2Hand = player.hand!;
            }
        }
        return baseClientRoom;
    }

    public removePlayerFromRoom(room: AtomikKFardEGameRoom, playerId: string): AtomikKFardEGameRoom {
        const initialPlayerCount = room.players.length;
        room.players = room.players.filter(player => player.id !== playerId);

        if (room.players.length < initialPlayerCount) {
            if (room.players.length === 0) {
                room.state = 'empty';
            }
        }
        return room;
    }
}