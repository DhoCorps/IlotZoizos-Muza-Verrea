// Ce fichier gère la logique et l'état des parties de CrazyMorpion.

import { Server } from 'socket.io'; // Importe seulement 'Server' pour émettre des événements
import {
    CrazyMorpionSymbol,
    CRAZYMORPION_SYMBOL_EMPTY,
    CRAZYMORPION_SYMBOL_PLUS,
    CRAZYMORPION_SYMBOL_MINUS,
    CrazyMorpionPlayer,     // Importe CrazyMorpionPlayer (qui étend PlayerInRoom)
    CrazyMorpionGameRoom as InternalCrazyMorpionGameRoom, // Importe l'interface du salon depuis Types.ts
} from '@ilot/shared-core';

import {
    createEmptyCrazyMorpionGrid,
    checkCrazyMorpionWinner,
    checkCrazyMorpionDraw,
    makeCrazyMorpionMove,
    getRandomCrazyMorpionSymbol
} from '@ilot/shared-core';

import {
    RoomToSend, // Type d'union générique pour toutes les données de pièce envoyées (inclut CrazyMorpionRoomToSend)
    CrazyMorpionRoomToSend,
    CrazyMorpionGameClientState // IMPORTANT: Importe ClientGlobalState pour le cast sur window.player
} from '@ilot/shared-core';

// 💾 IMPORT DU SERVICE D'ARCHIVAGE 
import { GameStatsService } from '@ilot/infrastructure';

// NOTE IMPORTANTE : L'interface CrazyMorpionGameRoom n'est plus définie ici.
// Elle est importée depuis './CrazyMorpionTypes.js' sous l'alias InternalCrazyMorpionGameRoom.
// C'est la source unique de vérité pour la structure d'un salon CrazyMorpion.

// Map pour stocker les salons CrazyMorpion gérés par ce Manager
const crazyMorpionRooms: Map<string, InternalCrazyMorpionGameRoom> = new Map();

// Nouvelle constante pour la période de grâce de reconnexion IMMÉDIATE (pour la navigation client)
const PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS = 1000; // 1 seconde de grâce pour se reconnecter après une déconnexion
const roundDuration=20;
/**
 * @class CrazyMorpionManager
 * @description Gère toute la logique et l'état des parties de CrazyMorpion.
 * Reçoit les commandes du `server.ts` et émet les mises à jour aux clients.
 */
export class CrazyMorpionManager {
    private io: Server; // Référence au serveur Socket.IO pour émettre des événements

    constructor(ioInstance: Server) {
        this.io = ioInstance;
        console.log('[CrazyMorpionManager] Initialisé.');
    }

    /**
     * @public
     * @description Crée un nouveau salon CrazyMorpion.
     * Appelé par `server.ts` lors d'une demande de création de salon de type CrazyMorpion.
     * @param {string} roomId L'ID unique du salon.
     * @param {string} roomName Le nom donné au salon.
     * @param {CrazyMorpionPlayer} creatorPlayer Les données du joueur créateur.
     * @returns {InternalCrazyMorpionGameRoom} L'objet du salon créé.
     */
    public createRoom(roomId: string, roomName: string, creatorPlayer: CrazyMorpionPlayer): InternalCrazyMorpionGameRoom {
        const newRoom: InternalCrazyMorpionGameRoom = {
            id: roomId,
            name: roomName,
            players: [creatorPlayer],
            grid: createEmptyCrazyMorpionGrid(),
            currentTurnPlayerId: null,
            state: 'waiting',
            winnerId: null,
            round: 1,
            gameType: 'CrazyMorpion',
            maxPlayers: 2,
            winningCells: null,
            scores: { [creatorPlayer.id]: 0 },
            // Nouvelle propriété pour gérer les minuteurs de déconnexion temporaire par joueur
            turnPassTimer : roundDuration,
            playerDisconnectTimers: new Map<string, NodeJS.Timeout>() // Initialiser la Map
        };
        crazyMorpionRooms.set(roomId, newRoom);
        console.log(`[CrazyMorpionManager] Salon CrazyMorpion '${newRoom.name}' (${newRoom.id}) créé.`);
        return newRoom;
    }

    /**
     * @public
     * @description Gère la logique lorsqu'un joueur tente de rejoindre un salon CrazyMorpion ou se reconnecte.
     * Appelé par `server.ts`.
     * @param {string} roomId L'ID du salon.
     * @param {string} username Le nom d'utilisateur du joueur.
     * @param {string} newSocketId Le nouvel ID de socket du joueur.
     * @returns {InternalCrazyMorpionGameRoom | undefined} Le salon mis à jour, ou `undefined` si le salon est plein ou n'existe pas.
     */
        public handlePlayerJoin(roomId: string, username: string, newSocketId: string): InternalCrazyMorpionGameRoom | undefined {
        const room = crazyMorpionRooms.get(roomId);
        if (!room) {
            console.warn(`[CrazyMorpionManager] Salon ${roomId} non trouvé pour la jonction du joueur ${username}.`);
            return undefined;
        }

        let playerEntry = room.players.find(p => p.username === username);

        // Annuler tout minuteur de passage de tour s'il existe (reconnexion)
        if (room.turnPassTimer) {
            clearTimeout(room.turnPassTimer);
            delete room.turnPassTimer;
            console.log(`[CrazyMorpionManager] Minuteur de passage de tour annulé pour le salon ${roomId} (joueur ${username} reconnecté).`);
        }

        // --- GESTION DE LA PÉRIODE DE GRÂCE ET NOUVEAU JOUEUR ---
        if (playerEntry) {
            // Cas 1: Joueur existant (potentiellement déconnecté temporairement ou déjà connecté)
            if (room.playerDisconnectTimers.has(username)) {
                clearTimeout(room.playerDisconnectTimers.get(username)!);
                room.playerDisconnectTimers.delete(username);
                console.log(`[CrazyMorpionManager - DEBUG] Minuteur de déconnexion temporaire annulé pour ${username} (reconnexion au salon ${roomId}).`);
            }

            // Mettre à jour l'ID du socket et le statut du joueur existant
            if (playerEntry.id !== newSocketId) {
                console.log(`[CrazyMorpionManager - DEBUG] Reconnexion de ${username}. Ancien socket ID: ${playerEntry.id}, Nouvel socket ID: ${newSocketId}.`);
                if (room.currentTurnPlayerId === playerEntry.id) {
                    room.currentTurnPlayerId = newSocketId;
                    console.log(`[CrazyMorpionManager] currentTurnPlayerId mis à jour vers le nouvel ID: ${newSocketId} pour ${username}.`);
                }
                playerEntry.id = newSocketId;
            }
            playerEntry.status = 'connected';
            console.log(`[CrazyMorpionManager] Joueur ${playerEntry.username} (${newSocketId}) reconnecté/mis à jour au salon ${roomId}.`);

        } else {
            // Cas 2: Nouveau joueur (aucun joueur avec ce username n'existe dans le salon)
            if (room.players.filter(p => p.status === 'connected').length < room.maxPlayers) {
                playerEntry = { // <-- Création de playerEntry ici
                    id: newSocketId,
                    socketId: newSocketId,
                    username: username,
                    symbol: CRAZYMORPION_SYMBOL_EMPTY,
                    score: 0,
                    roomId: room.id,
                    status: 'connected',
                    isReady: false
                };
                room.players.push(playerEntry); // <-- Ajout du nouveau joueur à la liste
                room.scores[playerEntry.id] = 0; // Initialisation de son score dans la room
                console.log(`[CrazyMorpionManager] Nouveau joueur ${playerEntry.username} (${newSocketId}) a rejoint le salon ${roomId}.`);
            } else {
                console.warn(`[CrazyMorpionManager] Connexion refusée pour ${username}: salon ${roomId} plein.`);
                return undefined;
            }
        }
        // --- FIN GESTION DE LA PÉRIODE DE GRÂCE ET NOUVEAU JOUEUR ---

        // Consolidation des joueurs (Ce bloc peut être simplifié ou revu si la logique ci-dessus est suffisante)
        // L'idée de cette consolidation est bonne pour les reconnexions, mais elle pourrait potentiellement
        // enlever un joueur nouvellement ajouté si par erreur il y avait un doublon transitoire.
        // Si la logique ci-dessus est stricte (un seul playerEntry par username),
        // alors cette consolidation pourrait devenir redondante ou nécessiter un affinement.
        // Pour l'instant, gardons-la telle quelle, car elle devrait toujours fonctionner si playerEntry est bien géré.
        const consolidatedPlayersMap = new Map<string, CrazyMorpionPlayer>();
        room.players.forEach(p => {
            const existing = consolidatedPlayersMap.get(p.username);
            // Toujours privilégier le joueur 'connected' si déjà dans la map, ou ajouter si nouveau/temp
            if (!existing || p.status === 'connected' || existing.status === 'disconnected_temp') {
                consolidatedPlayersMap.set(p.username, { ...p });
            }
        });
        room.players = Array.from(consolidatedPlayersMap.values());    room.players = Array.from(consolidatedPlayersMap.values());

        const connectedPlayersCount = room.players.filter(p => p.status === 'connected').length;

        // NOUVEAUX LOGS D'INSPECTION
        console.log(`[CrazyMorpionManager - DEBUG] Salon ${roomId}: Après consolidation. État des joueurs:`, room.players.map(p => ({id: p.id, username: p.username, status: p.status, symbol: (p as CrazyMorpionPlayer).symbol})));
        console.log(`[CrazyMorpionManager - DEBUG] Salon ${roomId}: connectedPlayersCount = ${connectedPlayersCount}, room.maxPlayers = ${room.maxPlayers}`);
        // FIN NOUVEAUX LOGS D'INSPECTION


        if (connectedPlayersCount === room.maxPlayers) {
            const activePlayers = room.players.filter(p => p.status === 'connected').sort((a, b) => a.username.localeCompare(b.username));

            // S'assurer que currentTurnPlayerId est défini s'il ne l'est pas ou si l'ancien est déconnecté
            if (!room.currentTurnPlayerId || !activePlayers.some(p => p.id === room.currentTurnPlayerId)) {
                if (activePlayers.length > 0) {
                    room.currentTurnPlayerId = activePlayers[0].id;
                } else {
                    room.currentTurnPlayerId = null;
                }
            }

            if (activePlayers.length >= 2) { // S'assurer qu'il y a bien 2 joueurs actifs pour assigner les symboles
                if(Math.random() <= 0.5){
                    (activePlayers[0] as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_PLUS;
                    (activePlayers[1] as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_MINUS;
                } else {
                    (activePlayers[0] as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_MINUS;
                    (activePlayers[1] as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_PLUS;
                }
            }

            if (room.state === 'waiting' || room.state === 'gameOver') {
                const wasGameOver = room.state === 'gameOver';
                room.grid = createEmptyCrazyMorpionGrid();
                room.winnerId = null;
                room.winningCells = null;
                room.state = 'playing'; // <-- ICI L'ÉTAT PASSE À 'playing'
                if (wasGameOver) {
                    room.round++;
                }
                console.log(`[CrazyMorpionManager] Partie démarrée/redémarrée dans le salon ${roomId}. Au tour de ${room.players.find(p => p.id === room.currentTurnPlayerId)?.username}. État du salon: ${room.state}`);

                // Émission 'game:init' pour tous les joueurs actifs
                room.players.filter(p => p.status === 'connected').forEach(p => {
                    console.log(`[CrazyMorpionManager - DEBUG] Émission 'game:init' vers socket ID: ${p.id} pour joueur ${p.username}.`); // NOUVEAU LOG
                    // Utilise RoomToSend (l'union) pour l'émission générique
                    this.io.to(p.id).emit('game:init', this.roomToRoomToSend(room)); // <-- 'game:init' EST ÉMIS ICI
                    console.log(`[CrazyMorpionManager] game:init envoyé à ${p.username} (${p.id}) pour le salon ${room.id}.`);
                });
            } else if (room.state === 'playing') {
                // Ce bloc est pour la RECONNEXION d'un joueur à une partie EN COURS
                console.log(`[CrazyMorpionManager] Salon ${roomId}: Reconnexion en cours de partie. État actuel envoyé à ${username}.`);
                console.log(`[CrazyMorpionManager - DEBUG] Émission 'room:joined' (état playing) vers socket ID: ${newSocketId} pour joueur ${username}.`); // NOUVEAU LOG
                this.io.to(newSocketId).emit('room:joined', this.roomToRoomToSend(room)); // Renvoie l'état du salon (playing)
                this.io.to(room.id).emit('game:update', this.roomToRoomToSend(room)); // Émet une mise à jour de la grille (pour tous)
            }
        } else {
            // Ce bloc est pour les salons qui NE SONT PAS ENCORE pleins
            console.log(`[CrazyMorpionManager] Salon ${roomId}: En attente de plus de joueurs. Envoi de l'état actuel (waiting) à ${username}.`);
            console.log(`[CrazyMorpionManager - DEBUG] Émission 'room:joined' (état waiting) vers socket ID: ${newSocketId} pour joueur ${username}.`); // NOUVEAU LOG
            this.io.to(newSocketId).emit('room:joined', this.roomToRoomToSend(room)); // Envoie l'état du salon (waiting)
        }
        // L'émission de 'room:list' est déléguée au server.ts pour une meilleure synchronisation
        // this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
        return room;
    }

    /**
     * @public
     * @description Gère un coup joué par un joueur.
     * Appelé par `server.ts` sur l'événement `game:make-move`.
     * @param {string} roomId L'ID du salon.
     * @param {string} playerId L'ID du joueur qui fait le coup.
     * @param {number} x La coordonnée X du coup.
     * @param {number} y La coordonnée Y du coup.
     * @param {CrazyMorpionSymbol} [chosenSymbolFromClient] Symbole choisi par le client (pour le mode triche).
     */
    public handleMakeMove(roomId: string, playerId: string, x: number, y: number, chosenSymbolFromClient?: CrazyMorpionSymbol): void {
        const room = crazyMorpionRooms.get(roomId);

        if (!room || room.state !== 'playing' || room.currentTurnPlayerId !== playerId) {
            this.io.to(playerId).emit('error:message', "Ce n'est pas votre tour ou la partie n'est pas active.");
            console.warn(`[CrazyMorpionManager] Coup invalide pour le salon ${roomId}: ce n'est pas le tour de ${playerId} ou jeu inactif.`);
            return;
        }

        const player = room.players.find(p => p.id === playerId);
        const opponent = room.players.find(p => p.id !== playerId && p.status === 'connected'); // S'assurer que l'adversaire est connecté

        if (!player || !opponent) {
            this.io.to(playerId).emit('error:message', "Joueur ou adversaire non trouvé dans le salon.");
            console.error(`[CrazyMorpionManager] Joueur ${playerId} ou adversaire non trouvé dans le salon ${roomId}.`);
            return;
        }
    // --- DÉBUT LOGIQUE DU MODE TRICHE (CORRIGÉ ET SIMPLIFIÉ) ---
        let symbolToPlaceInGrid: CrazyMorpionSymbol;

        // Si chosenSymbolFromClient est défini, cela signifie que le client a activé
        // la sélection manuelle et a envoyé un symbole. On considère cela comme le "mode triche".
        if (chosenSymbolFromClient) {
            symbolToPlaceInGrid = chosenSymbolFromClient; // Utilise le symbole choisi par le client (mode triche)
            console.log(`[CrazyMorpionManager - CHEAT MODE] Joueur ${player.username} (${playerId}) utilise le symbole choisi manuellement: ${symbolToPlaceInGrid}.`);
        } else {
            // Sinon (chosenSymbolFromClient n'est pas fourni), on génère aléatoirement
            // parmi TOUS les symboles possibles pour le mode normal.
            symbolToPlaceInGrid = getRandomCrazyMorpionSymbol();
            console.log(`[CrazyMorpionManager - NORMAL MODE] Symbole aléatoire généré pour ${player.username} (${playerId}): ${symbolToPlaceInGrid}.`);
        }
    // --- FIN LOGIQUE DU MODE TRICHE ---


        const { newGrid } = makeCrazyMorpionMove(room.grid, x, y, player.symbol, symbolToPlaceInGrid);
        room.grid = newGrid;
        const drawInfo = checkCrazyMorpionDraw(room.grid, player.symbol, opponent.symbol);
        const winInfo = checkCrazyMorpionWinner(room.grid, player.symbol, opponent.symbol); // Symbols are CrazyMorpionrSymbol

        let roundWinnerId: string | null = null;
        let roundWinningCells: { x: number; y: number; symbol: CrazyMorpionSymbol }[] | null = null;

        if (winInfo.playerHasWon && !winInfo.ennemyHasWon) {
            roundWinnerId = playerId;
            roundWinningCells = winInfo.playerWinningCells;
            console.log(`[CrazyMorpionManager] ${player.username} (${player.symbol}) a gagné dans le salon ${roomId}!`);
        } else if (winInfo.ennemyHasWon && !winInfo.playerHasWon) {
            roundWinnerId = opponent.id;
            roundWinningCells = winInfo.ennemyWinningCells;
            console.log(`[CrazyMorpionManager] L'adversaire ${opponent.username} (${opponent.symbol}) a gagné dans le salon ${roomId}!`);
        } else if (winInfo.playerHasWon && winInfo.ennemyHasWon) {
            if (winInfo.playerWinningCombinationsCount > winInfo.ennemyWinningCombinationsCount) {
                roundWinnerId = playerId;
                roundWinningCells = winInfo.playerWinningCells;
                console.log(`[CrazyMorpionManager] Cas Crazy (Multi-victoire): ${player.username} a plus de combinaisons gagnantes dans le salon ${roomId}!`);
            } else if (winInfo.ennemyWinningCombinationsCount > winInfo.playerWinningCombinationsCount) {
                roundWinnerId = opponent.id;
                roundWinningCells = winInfo.ennemyWinningCells;
                console.log(`[CrazyMorpionManager] Cas Crazy (Multi-victoire): ${opponent.username} a plus de combinaisons gagnantes dans le salon ${roomId}!`);
            } else {
                console.log(`[CrazyMorpionManager] Cas Crazy (Multi-victoire): Combinaisons égales. La partie continue.`);
            }
        }

        if (roundWinnerId) {
            room.state = 'gameOver';
            room.winnerId = roundWinnerId;
            const actualWinnerPlayer = room.players.find(p => p.id === roundWinnerId);
            if (actualWinnerPlayer) {
                actualWinnerPlayer.score++;
                room.scores[actualWinnerPlayer.id] = (room.scores[actualWinnerPlayer.id] || 0) + 1;
            }

            console.log(`[CrazyMorpionManager] Le joueur ${actualWinnerPlayer?.username} a remporté la manche dans le salon ${roomId}!`);
            
            // =========================================================
            // 💾 ARCHIVAGE DE LA PARTIE (MONGO + NEO4J)
            // =========================================================
            // CrazyMorpion n'a pas de timer de manche complexe, on peut estimer 
            // la durée via le nombre de coups, ou utiliser une date par défaut
            const estimatedDuration = room.round * 30; // 30 sec par manche par défaut

            const matchData = {
                gameType: 'CrazyMorpion' as const,
                roomId: room.id,
                startedAt: new Date(Date.now() - (estimatedDuration * 1000)),
                endedAt: new Date(),
                durationSeconds: estimatedDuration,
                players: room.players.map(p => ({
                    uid: p.id,
                    pseudo: p.username,
                    score: room.scores[p.id] || 0,
                    isWinner: p.id === roundWinnerId,
                    specificStats: {
                        symbolAssigned: (p as CrazyMorpionPlayer).symbol
                    }
                })),
                matchMetadata: {
                    totalRounds: room.round,
                    draw: false
                }
            };

            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[CrazyMorpionManager] Historique sauvegardé avec succès pour le salon ${roomId}`);
            });
            // =========================================================

            // Émet la RoomToSend complète (qui inclut winnerId, grid, players etc.)
            this.io.to(roomId).emit('game:over', this.roomToRoomToSend(room));
            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
            return;
        }

        // --- GESTION DU MATCH NUL ---
        if (drawInfo && !winInfo.playerHasWon && !winInfo.ennemyHasWon) {
            room.state = 'gameOver';
            room.winnerId = 'draw'; // Signal d'égalité
            
            console.log(`[CrazyMorpionManager] ÉGALITÉ dans le salon ${roomId}! Grille pleine sans vainqueur.`);
            
            // =========================================================
            // 💾 ARCHIVAGE DE LA PARTIE (ÉGALITÉ)
            // =========================================================
            const estimatedDuration = room.round * 30;
            const matchData = {
                gameType: 'CrazyMorpion' as const,
                roomId: room.id,
                startedAt: new Date(Date.now() - (estimatedDuration * 1000)),
                endedAt: new Date(),
                durationSeconds: estimatedDuration,
                players: room.players.map(p => ({
                    uid: p.id,
                    pseudo: p.username,
                    score: room.scores[p.id] || 0,
                    isWinner: false, // Pas de vainqueur
                    specificStats: { symbolAssigned: (p as CrazyMorpionPlayer).symbol }
                })),
                matchMetadata: {
                    totalRounds: room.round,
                    draw: true
                }
            };

            GameStatsService.recordMatch(matchData).then((success: boolean) => {
                if(success) console.log(`[CrazyMorpionManager] Historique (Match Nul) sauvegardé pour le salon ${roomId}`);
            });
            // =========================================================

            this.io.to(roomId).emit('game:over', this.roomToRoomToSend(room));
            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
            return;
        }

        // Le jeu continue, passer le tour
        const otherPlayer = room.players.find(p => p.id !== playerId && p.status === 'connected');
        if (otherPlayer) {
            room.currentTurnPlayerId = otherPlayer.id;
            console.log(`[CrazyMorpionManager] Tour passé à ${otherPlayer.username} dans le salon ${room.id}.`);
        } else {
            room.state = 'gameOver';
            room.winnerId = null;
            this.io.to(roomId).emit('game:interrupted', { message: "L'autre joueur s'est déconnecté en cours de partie.", gameType: 'CrazyMorpion' });
            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
            return;
        }

        // Émet une mise à jour de la room complète (GameBoardUpdateData est un alias de RoomToSend)
        this.io.to(roomId).emit('game:update', this.roomToRoomToSend(room));
    }

    /**
     * @public
     * @description Gère une demande de redémarrage de partie.
     * Appelé par `server.ts` sur l'événement `game:restart-request`.
     * @param {string} roomId L'ID du salon.
     * @param {string} requestingPlayerId L'ID du joueur qui demande le redémarrage.
     * @returns {InternalCrazyMorpionGameRoom | undefined} Retourne le salon mis à jour ou undefined.
     */
    public handleRestartRequest(roomId: string, requestingPlayerId: string): InternalCrazyMorpionGameRoom | undefined {
        const room = crazyMorpionRooms.get(roomId);
        if (!room) {
            this.io.to(requestingPlayerId).emit('error:message', 'Salon non trouvé.');
            return undefined; // Retourne undefined si le salon n'existe pas
        }

        const requestingPlayer = room.players.find(p => p.id === requestingPlayerId && p.status === 'connected');
        if (!requestingPlayer) {
            this.io.to(requestingPlayerId).emit('error:message', 'Vous devez être connecté au salon pour demander un redémarrage.');
            return undefined; // Retourne undefined si le joueur n'est pas connecté
        }

        if (room.players.filter(p => p.status === 'connected').length < room.maxPlayers) {
            console.log(`[CrazyMorpionManager] Salon ${roomId}: Tentative de redémarrage avec moins de ${room.maxPlayers} joueurs connectés.`);
            this.io.to(requestingPlayerId).emit('error:message', 'Attente d\'un autre joueur pour redémarrer.');
            return undefined; // Retourne undefined si pas assez de joueurs
        }

        room.grid = createEmptyCrazyMorpionGrid();
        room.state = 'playing';
        room.winnerId = null;
        room.winningCells = null;
        room.round++;

        const connectedPlayers = room.players.filter(p => p.status === 'connected').sort((a, b) => a.username.localeCompare(b.username));

        if (connectedPlayers.length === 2) {
            const [player1, player2] = connectedPlayers;
            room.currentTurnPlayerId = room.round % 2 === 1 ? player1.id : player2.id;
            (player1 as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_PLUS; // Assigner symboles pour restart
            (player2 as CrazyMorpionPlayer).symbol = CRAZYMORPION_SYMBOL_MINUS; // Assigner symboles pour restart
            console.log(`[CrazyMorpionManager] Salon ${roomId}: Manche ${room.round} redémarrée. Au tour de ${room.players.find(p => p.id === room.currentTurnPlayerId)?.username}.`);
        } else {
            console.error("[CrazyMorpionManager] Erreur: Nombre de joueurs connectés inattendu pour le redémarrage. Pas de tour assigné.");
            room.currentTurnPlayerId = null;
            room.state = 'waiting';
        }

        // Émet une mise à jour de la RoomToSend complète (RestartGameData est un alias de RoomToSend)
        this.io.to(roomId).emit('game:restart', this.roomToRoomToSend(room));
        this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
        return room; // Retourne le salon mis à jour
    }

    /**
     * @public
     * @description Notifie le manager qu'un joueur s'est déconnecté.
     * Appelé par `server.ts`. Gère le statut du joueur et le passage de tour avec délai de grâce.
     * @param {string} socketId L'ID du socket qui s'est déconnecté.
     * @param {string} roomId L'ID du salon concerné.
     */
    public notifyPlayerDisconnect(socketId: string, roomId: string): void {
        const room = crazyMorpionRooms.get(roomId);
        if (!room) return;

        const playerToDisconnect = room.players.find(p => p.id === socketId);
        if (!playerToDisconnect) {
            console.warn(`[CrazyMorpionManager] Joueur avec socket ID ${socketId} non trouvé dans le salon ${roomId} lors de la déconnexion.`);
            return;
        }

        // Si c'est un joueur actif (connecté) qui se déconnecte...
        if (playerToDisconnect.status === 'connected') {
            playerToDisconnect.status = 'disconnected_temp'; // Nouveau statut temporaire
            console.log(`[CrazyMorpionManager] Joueur ${playerToDisconnect.username} (${socketId}) marqué 'disconnected_temp' du salon CrazyMorpion ${roomId}.`);

            // Nettoyer tout minuteur précédent pour ce joueur (par son username)
            if (room.playerDisconnectTimers.has(playerToDisconnect.username)) {
                clearTimeout(room.playerDisconnectTimers.get(playerToDisconnect.username)!);
                room.playerDisconnectTimers.delete(playerToDisconnect.username);
                console.log(`[CrazyMorpionManager - DEBUG] Annulation d'un minuteur existant pour ${playerToDisconnect.username}.`);
            }
            // Démarrer un nouveau minuteur de grâce
            const graceTimer = setTimeout(() => {
                const currentRoom = crazyMorpionRooms.get(roomId);
                if (currentRoom) {
                    const playerStillTempDisconnected = currentRoom.players.find(
                        p => p.username === playerToDisconnect.username && p.status === 'disconnected_temp'
                    );

                    if (playerStillTempDisconnected) {
                        // Le joueur n'a pas réussi à se reconnecter dans la période de grâce
                        playerStillTempDisconnected.status = 'disconnected'; // Marquer comme définitivement déconnecté
                        console.log(`[CrazyMorpionManager] Minuteur expiré: ${playerToDisconnect.username} est définitivement déconnecté. Passage du tour si nécessaire.`);

                        // Si c'était le tour de ce joueur déconnecté, passer le tour ou interrompre la partie
                        if (currentRoom.currentTurnPlayerId === playerStillTempDisconnected.id && currentRoom.state === 'playing') {
                            const otherActivePlayer = currentRoom.players.find(p => p.id !== playerStillTempDisconnected.id && p.status === 'connected');
                            if (otherActivePlayer) {
                                currentRoom.currentTurnPlayerId = otherActivePlayer.id;
                                console.log(`[CrazyMorpionManager] Tour passé à ${otherActivePlayer.username} dans le salon ${currentRoom.id}.`);
                                // Émettre une mise à jour du jeu pour le passage de tour
                                this.io.to(currentRoom.id).emit('game:update', this.roomToRoomToSend(currentRoom));
                            } else {
                                // Plus personne n'est connecté (cas où l'autre joueur aussi s'est déconnecté définitivement)
                                currentRoom.state = 'gameOver';
                                currentRoom.winnerId = null;
                                console.log(`[CrazyMorpionManager] Partie interrompue dans le salon ${currentRoom.id}: plus de joueurs connectés après déconnexion définitive.`);
                                
                                // =========================================================
                                // 💾 ARCHIVAGE FORFAITAIRE (VICTOIRE PAR FORFAIT OU ANNULATION)
                                // =========================================================
                                // Comme les deux joueurs sont déconnectés, c'est un match nul forcé
                                const estimatedDuration = currentRoom.round * 30;
                                const matchData = {
                                    gameType: 'CrazyMorpion' as const,
                                    roomId: currentRoom.id,
                                    startedAt: new Date(Date.now() - (estimatedDuration * 1000)),
                                    endedAt: new Date(),
                                    durationSeconds: estimatedDuration,
                                    players: currentRoom.players.map(p => ({
                                        uid: p.id,
                                        pseudo: p.username,
                                        score: currentRoom.scores[p.id] || 0,
                                        isWinner: false, 
                                        specificStats: { disconnectStatus: p.status }
                                    })),
                                    matchMetadata: { reason: 'All players disconnected' }
                                };
                                GameStatsService.recordMatch(matchData).then((success: boolean) => {
                                    if(success) console.log(`[CrazyMorpionManager] Historique d'interruption sauvegardé pour ${roomId}`);
                                });
                                // =========================================================

                                this.io.to(currentRoom.id).emit('game:interrupted', { message: `Tous les joueurs sont déconnectés du salon.`, gameType: 'CrazyMorpion' });
                            }
                            // Émettre la mise à jour de la room à tous les joueurs du salon + la liste des salons globale
                            this.io.to(currentRoom.id).emit('room:joined', this.roomToRoomToSend(currentRoom));
                            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
                        } else if (currentRoom.players.filter(p => p.status === 'connected').length === 1 && currentRoom.state === 'playing') {
                            // Si un joueur quitte (définitivement) et qu'il en reste un
                            const winnerPlayer = currentRoom.players.find(p => p.status === 'connected');
                            
                            // =========================================================
                            // 💾 ARCHIVAGE VICTOIRE PAR FORFAIT
                            // =========================================================
                            if(winnerPlayer) {
                                const estimatedDuration = currentRoom.round * 30;
                                const matchData = {
                                    gameType: 'CrazyMorpion' as const,
                                    roomId: currentRoom.id,
                                    startedAt: new Date(Date.now() - (estimatedDuration * 1000)),
                                    endedAt: new Date(),
                                    durationSeconds: estimatedDuration,
                                    players: currentRoom.players.map(p => ({
                                        uid: p.id,
                                        pseudo: p.username,
                                        score: currentRoom.scores[p.id] || 0,
                                        isWinner: p.id === winnerPlayer.id, 
                                        specificStats: { wonByForfeit: p.id === winnerPlayer.id }
                                    })),
                                    matchMetadata: { reason: 'Opponent disconnected' }
                                };
                                GameStatsService.recordMatch(matchData).then((success: boolean) => {
                                    if(success) console.log(`[CrazyMorpionManager] Historique forfaitaire sauvegardé pour ${roomId}`);
                                });
                            }
                            // =========================================================

                            currentRoom.state = 'waiting';
                            currentRoom.currentTurnPlayerId = null;
                            currentRoom.winningCells = null;
                            currentRoom.winnerId = null;
                            currentRoom.grid = createEmptyCrazyMorpionGrid(); // Réinitialiser la grille
                            console.log(`[CrazyMorpionManager] Salon ${currentRoom.id} est maintenant en attente suite au départ définitif d'un joueur. (1 joueur restant)`);
                            this.io.to(currentRoom.id).emit('room:joined', this.roomToRoomToSend(currentRoom));
                            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
                        } else if (currentRoom.players.filter(p => p.status === 'connected').length === 0 && currentRoom.state === 'playing') {
                            // Si le salon n'a plus AUCUN joueur connecté après qu'un joueur temporairement déconnecté passe en déconnecté définitif
                            currentRoom.state = 'gameOver';
                            currentRoom.winnerId = null;
                            console.log(`[CrazyMorpionManager] Partie interrompue dans le salon ${currentRoom.id}: tous les joueurs sont définitivement déconnectés.`);
                            this.io.to(currentRoom.id).emit('game:interrupted', { message: `Tous les joueurs sont déconnectés du salon.`, gameType: 'CrazyMorpion' });
                            this.io.emit('room:list', Array.from(crazyMorpionRooms.values()).map(this.roomToRoomToSend));
                        }
                    } else {
                        console.log(`[CrazyMorpionManager] Minuteur pour ${playerToDisconnect.username} expiré, mais le joueur n'est plus en statut 'disconnected_temp' (reconnecté ou déjà géré).`);
                    }
                }
                room.playerDisconnectTimers.delete(playerToDisconnect.username); // Assurez-vous de supprimer le minuteur après son exécution
            }, PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS);

            room.playerDisconnectTimers.set(playerToDisconnect.username, graceTimer); // Utilisez le username comme clé
            console.log(`[CrazyMorpionManager] Minuteur de grâce de reconnexion démarré pour ${playerToDisconnect.username} au salon ${roomId}.`);
        } else if (playerToDisconnect.status === 'disconnected_temp') {
            // Si le joueur était déjà en mode 'disconnected_temp', on attend que le timer fasse son travail.
            console.log(`[CrazyMorpionManager] Joueur ${playerToDisconnect.username} (${socketId}) est déjà en statut 'disconnected_temp'.`);
        } else if (playerToDisconnect.status === 'disconnected') {
            // Si le joueur était déjà définitivement déconnecté, aucune action.
            console.log(`[CrazyMorpionManager] Joueur ${playerToDisconnect.username} (${socketId}) est déjà définitivement déconnecté. Aucune action.`);
        }
        // Pas besoin d'émettre room:list ici, server.ts le gère.
    }

    /**
     * @public
     * @description Supprime un salon CrazyMorpion de la liste gérée.
     * Appelé par `server.ts` après la période de grâce.
     * @param {string} roomId L'ID du salon à supprimer.
     * @returns {void}
     */
    public deleteRoom(roomId: string): void {
        if (crazyMorpionRooms.has(roomId)) {
            const room = crazyMorpionRooms.get(roomId)!;
            // Nettoyer tous les minuteurs de déconnexion temporaire pour les joueurs de ce salon
            room.playerDisconnectTimers.forEach(timer => clearTimeout(timer));
            room.playerDisconnectTimers.clear();
            if (room.turnPassTimer) {
                clearTimeout(room.turnPassTimer);
            }
            crazyMorpionRooms.delete(roomId);
            console.log(`[CrazyMorpionManager] Salon CrazyMorpion ${roomId} supprimé.`);
            // Pas besoin d'émettre room:list ici, server.ts le fait après la suppression.
        }
    }

    /**
     * @public
     * @description Retourne un salon CrazyMorpion par son ID.
     * @param {string} roomId L'ID du salon.
     * @returns {InternalCrazyMorpionGameRoom | undefined} Le salon ou undefined s'il n'existe pas.
     */
    public getRoom(roomId: string): InternalCrazyMorpionGameRoom | undefined {
        return crazyMorpionRooms.get(roomId);
    }

    /**
     * @public
     * @description Retourne tous les salons CrazyMorpion gérés par ce manager.
     * @returns {InternalCrazyMorpionGameRoom[]} Un tableau de tous les salons.
     */
    public getAllRooms(): InternalCrazyMorpionGameRoom[] {
        return Array.from(crazyMorpionRooms.values());
    }

    /**
     * @private
     * @description Convertit un objet `InternalCrazyMorpionGameRoom` interne en un objet `CrazyMorpionRoomToSend`
     * pour l'envoi au client.
     * @param room L'objet `InternalCrazyMorpionGameRoom` interne du manager.
     * @returns {CrazyMorpionRoomToSend} L'objet `CrazyMorpionRoomToSend` pour le client.
     */
    private roomToRoomToSend(room: InternalCrazyMorpionGameRoom): CrazyMorpionRoomToSend { // Retourne CrazyMorpionRoomToSend directement
        // Mappe les joueurs internes (CrazyMorpionPlayer) vers CrazyMorpionPlayer (le type est le même ici)
        const playersToSend: CrazyMorpionPlayer[] = room.players.map(p => ({
            id: p.id,
            socketId: p.socketId,
            username: p.username,
            symbol: p.symbol, // symbol est défini sur CrazyMorpionPlayer
            score: p.score,
            roomId: p.roomId,
            status: p.status,
            isReady: p.isReady,
        }));

        // Crée l'objet CrazyMorpionRoomToSend
        const roomDataToSend: CrazyMorpionRoomToSend = {
            id: room.id,
            name: room.name,
            gameType: room.gameType, // 'CrazyMorpion'
            players: playersToSend,
            state: room.state,
            currentTurnPlayerId : room.currentTurnPlayerId,
            winnerId: room.winnerId,
            round: room.round,
            maxPlayers: room.maxPlayers,
            grid: room.grid,
            winningCells: room.winningCells,
            scores: room.scores,
            lastPlacedSymbol : getRandomCrazyMorpionSymbol(), // Ajouté si 'lastPlacedSymbol' existe sur 'room', sinon on initialise
            symbol : CRAZYMORPION_SYMBOL_EMPTY,
            currentFlag : null
        };
    
        return roomDataToSend; // Retourne l'objet spécifique, qui est compatible avec RoomToSend
    }
}