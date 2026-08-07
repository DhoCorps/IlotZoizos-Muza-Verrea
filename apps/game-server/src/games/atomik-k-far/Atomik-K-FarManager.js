import { CellOwner } from "@ilot/shared-core"; // S'assurer que les imports sont corrects
import { AtomikKFardELogic } from "@ilot/shared-core"; // Importer la logique
// 💾 IMPORT DU SERVICE D'ARCHIVAGE (Assure-toi que ce chemin correspond à ton arborescence)
import { GameStatsService } from '@ilot/infrastructure';
// REMARQUE : `atomikKFardERooms` n'est plus une variable globale ici.
// Elle sera gérée comme une propriété d'instance dans la classe AtomikKFardEManager.
const MAX_PLAYERS_PER_ROOM = 2;
const PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS = 1000;
const ROUND_DURATION_SECONDS = 60; // Durée par défaut d'un round en secondes
/**
 * @class AtomikKFardEManager
 * @description Gère l'état et la logique du jeu Atomik-K-Fard(e) pour une salle de jeu donnée.
 * Cette classe est responsable de la création, de la mise à jour et de la progression des parties.
 */
export class AtomikKFardEManager {
    io;
    rooms; // <-- C'est cette map qui sera utilisée
    gameLogics; // Pour gérer la logique de chaque salle si besoin
    // Le constructeur prendra l'instance de Socket.IO
    constructor(ioInstance) {
        this.io = ioInstance;
        this.rooms = new Map(); // <-- Initialise la map ici pour l'instance
        this.gameLogics = new Map(); // Initialisation si tu utilises une logique par salle
    }
    /**
     * @function createRoom
     * @description Crée une nouvelle salle de jeu Atomik K Fard(E).
     * @param {string} roomId L'ID unique de la salle.
     * @param {string} roomName Le nom de la salle.
     * @param {string} ownerId L'ID unique du joueur propriétaire (qui a créé la salle).
     * @param {string} ownerUsername Le nom d'utilisateur du propriétaire.
     * @param {string} ownerSocketId Le socket ID du propriétaire (important pour la communication serveur).
     * @param {AtomikKFardEGameOptions} gameOptions Les options de jeu pour cette salle.
     * @returns {AtomikKFardEGameRoom} L'état initial de la salle au format serveur.
     */
    createRoom(roomId, roomName, ownerId, ownerUsername, ownerSocketId, gameOptions) {
        if (this.rooms.has(roomId)) {
            // C'est une bonne pratique de logguer l'erreur côté serveur pour le débogage
            console.error(`[AtomikKFardEManager] Erreur: Une salle avec l'ID '${roomId}' existe déjà.`);
            throw new Error(`Une salle avec l'ID '${roomId}' existe déjà.`);
        }
        // Crée l'objet Player complet pour le propriétaire
        // CORRECTION: Utilisation de AtomikKFardEPlayer au lieu de Player générique
        const ownerPlayer = {
            id: ownerId,
            roomId: roomId,
            username: ownerUsername,
            socketId: ownerSocketId,
            isReady: false,
            score: 0,
            status: 'connected',
            gameType: 'AtomikKFardE',
            hand: [],
            deck: [], // Initialisation vide requise par l'interface
            isConnected: true
        };
        // Déduis maxPlayers de gameOptions.nbPlayer avec une valeur par défaut sûre
        let maxPlayers;
        switch (gameOptions.nbPlayer) {
            case 'duo':
                maxPlayers = 2;
                break;
            case '2vs2':
                maxPlayers = 4;
                break;
            default:
                // Log une erreur si le nombre de joueurs est inattendu
                console.warn(`[AtomikKFardEManager] Nombre de joueurs inattendu: ${gameOptions.nbPlayer}. Défaut à 2.`);
                maxPlayers = 2;
                break;
        }
        // Initialisation de la grille pour les joueurs (assurez-vous que AtomikKFardELogic existe)
        const initialPlayerGrids = {
            [ownerPlayer.id]: AtomikKFardELogic.createEmptyAtomikKFardEGrid(gameOptions.option)
        };
        // Crée la nouvelle salle de jeu de type AtomikKFardEGameRoom (le type SERVEUR)
        const newRoom = {
            id: roomId,
            ownerId: ownerPlayer.id,
            name: roomName,
            players: [ownerPlayer], // Le tableau des joueurs contient déjà le propriétaire
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
            // LA CORRECTION : Calculer le nombre de joueurs connectés à partir du tableau `players`
            connectedPlayersCount: [ownerPlayer].length, // Ou plus générique: newRoom.players.length si elle était déjà définie
        };
        // Pour s'assurer que connectedPlayersCount est toujours à jour
        // Une fois la salle créée et le propriétaire ajouté, on peut le déduire
        newRoom.connectedPlayersCount = newRoom.players.length;
        this.rooms.set(roomId, newRoom);
        console.log(`[AtomikKFardEManager] Salle '${roomId}' nommée '${roomName}' créée par ${ownerPlayer.username} (${ownerPlayer.id}).`);
        console.log(`[AtomikKFardEManager] État initial de la salle ${roomId}:`, newRoom); // Log complet de la salle
        return newRoom;
    }
    /**
     * @private
     * @function transformRoomToClientFormat
     * @description Transforme un objet AtomikKFardEGameRoom interne en un objet RoomToSend pour le client.
     * Cette fonction filtre les données sensibles ou non pertinentes pour le client.
     * @param {AtomikKFardEGameRoom} room L'objet salle de jeu interne.
     * @param {string} requestingPlayerId L'ID du joueur qui demande l'état de la salle (pour personnaliser les mains).
     * @returns {AtomikKFardERoomToSend} L'objet salle formaté pour l'envoi au client.
     */
    transformRoomToClientFormat(room, requestingPlayerId) {
        const player1 = room.players.find(p => p.id === requestingPlayerId);
        const player2 = room.players.find(p => p.id !== requestingPlayerId); // Le "deuxième" joueur, si existant
        // Assurez-vous d'initialiser les mains même si les joueurs ne sont pas trouvés pour éviter undefined
        const player1Hand = player1 ? player1.hand : [];
        const player2Hand = player2 ? player2.hand : []; // La main de l'autre joueur, sera vide pour le client demandeur
        return {
            currentBoardState: room.grid,
            roundResults: room.roundResults,
            playerStates: room.playerStates,
            teams: room.teams,
            cafardBombPlayer1PropagationOrigin: room.cafardBombPlayer1PropagationOrigin,
            cafardBombPlayer2PropagationOrigin: room.cafardBombPlayer2PropagationOrigin,
            bombPropagationOrigin: room.bombPropagationOrigin,
            playerDisconnectTimers: room.playerDisconnectTimers,
            gameHistory: room.gameHistory,
            maxRounds: room.maxRounds,
            roundTimerInterval: room.roundTimerInterval,
            timePerRound: room.timePerRound,
            currentRoundTimer: room.currentRoundTimer,
            discardPile: room.discardPile,
            playerGrids: room.playerGrids,
            team1Players: room.team1Players,
            team2Players: room.team2Players,
            gameType: 'AtomikKFardE',
            id: room.id,
            deck: room.deck,
            name: room.name,
            round: room.currentRound,
            scores: room.scores,
            ownerId: room.ownerId, // Added
            state: room.state,
            maxPlayers: room.maxPlayers,
            players: room.players.map(p => ({
                gameType: 'AtomikKFardE',
                id: p.id,
                socketId: p.socketId, // Added: socketId for client-side identification
                username: p.username,
                isReady: p.isReady,
                roomId: room.id,
                deck: room.deck,
                hand: room.deck,
                status: 'connected', // Assuming connected if in `room.players`
                symbol: null, // You'll need to assign symbols if you use them.
                score: room.scores[p.id] || 0, // Get individual player's score
                // deck: p.deck! // Removed: Player's deck/hand is `hand`, not `deck`. Also, `deck` is for the room.
                // If `deck` was meant to be the player's hand, use `hand` instead, but see `player1HandForClient` above.
            })),
            grid: room.grid,
            currentRound: room.currentRound,
            currentRoundTimeLeft: room.currentRoundTimeLeft,
            currentPlayerTurn: room.currentPlayerTurn, // Added
            winnerId: room.winnerId,
            player1Hand: player1Hand,
            player2Hand: player2Hand, // This will be empty unless player2 is the requestingPlayerId
            // These scores need to reflect the specific player's score or team's score.
            // Using the requestingPlayerId logic:
            // Team scores
            team1Score: room.team1Score,
            team2Score: room.team2Score,
            team1ControlledCellsTotal: room.team1ControlledCellsTotal, // Explicitly added
            team2ControlledCellsTotal: room.team2ControlledCellsTotal, // Explicitly added
            // Game options
            gameOptions: {
                nbPlayer: room.gameOptions.nbPlayer,
                mode: room.gameOptions.mode,
                option: room.gameOptions.option,
                teamMode: room.gameOptions.teamMode,
                gameStyle: room.gameOptions.gameStyle,
                scoreToWin: room.gameOptions.scoreToWin,
                maxRounds: room.gameOptions.maxRounds,
                timePerRound: room.gameOptions.timePerRound,
            },
        };
    }
    /**
     * @public
     * @description Ajoute un joueur à une salle de jeu existante.
     * Cette méthode est maintenant une méthode d'instance.
     * @param {AtomikKFardEGameRoom} room La salle de jeu.
     * @param {string} playerId L'ID du joueur à ajouter.
     * @returns {AtomikKFardEGameRoom} La salle de jeu mise à jour.
     * @throws {Error} Si la salle est pleine ou si le joueur existe déjà.
     */
    addPlayerToRoom(room, playerId, username) {
        if (room.players.length >= room.maxPlayers) {
            throw new Error(`La salle ${room.id} est déjà pleine.`);
        }
        if (room.players.some(p => p.id === playerId)) {
            throw new Error(`Le joueur ${playerId} est déjà dans la salle ${room.id}.`);
        }
        // CORRECTION: Utilisation de AtomikKFardEPlayer au lieu de Player générique
        const newPlayer = {
            gameType: 'AtomikKFardE',
            roomId: room.id,
            status: 'connected',
            id: playerId,
            socketId: '',
            username: username, // Utilise le username passé en paramètre
            hand: [],
            deck: [], // Initialisation vide requise
            score: 0,
            isConnected: true,
            isReady: false,
        };
        room.players.push(newPlayer);
        room.playerStates[playerId] = {
            hasPlayedThisRound: false,
            playedCard: null,
            playedCoordinates: null,
            submittedGrid: [],
            hasSubmitted: false
        };
        room.scores[playerId] = 0; // Initialise le score du nouveau joueur
        // Distribuer les cartes initiales au nouveau joueur
        newPlayer.hand = AtomikKFardELogic.drawNewHand([], newPlayer.deck, [], []);
        // Assigner le joueur à l'équipe 2 si la salle supporte les équipes et qu'il n'y a pas de team 2 existante
        if (room.maxPlayers === 2 && room.teams.player2.length === 0) {
            room.teams.player2.push(playerId);
        }
        else if (room.maxPlayers > 2) {
            if (room.teams.player1.length <= room.teams.player2.length) {
                room.teams.player1.push(playerId);
            }
            else {
                room.teams.player2.push(playerId);
            }
        }
        room.state = room.players.length === room.maxPlayers ? 'readyToStart' : 'waitingForPlayers';
        return room; // Retourne l'objet interne, la conversion se fera à l'envoi
    }
    deleteRoom(roomId) {
        console.log(`[AtomikKFardEManager] deleteRoom: Demande de suppression du salon ${roomId}.`);
        const room = this.rooms.get(roomId); // Utilise this.rooms
        if (room) {
            if (room.roundTimerInterval) {
                clearInterval(room.roundTimerInterval);
                room.roundTimerInterval = null;
                console.log(`[AtomikKFardEManager] deleteRoom: Timer de round pour le salon ${roomId} arrêté.`);
            }
            room.playerDisconnectTimers.forEach(timer => clearTimeout(timer));
            room.playerDisconnectTimers.clear();
            console.log(`[AtomikKFardEManager] deleteRoom: Nettoyage des timers de déconnexion pour le salon ${roomId}.`);
            this.rooms.delete(roomId); // Utilise this.rooms
            console.log(`[AtomikKFardEManager] deleteRoom: Salon AtomikKFardE ${roomId} supprimé.`);
            this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r))); // Utilise this.rooms et this.toClientRoom
        }
        else {
            console.warn(`[AtomikKFardEManager] deleteRoom: Salon ${roomId} non trouvé pour la suppression.`);
        }
    }
    /**
     * @public
     * @description Marque un joueur comme "prêt".
     * Cette méthode est maintenant une méthode d'instance.
     * @param {AtomikKFardEGameRoom} room La salle de jeu.
     * @param {string} playerId L'ID du joueur.
     * @param {boolean} isReady L'état de préparation.
     * @returns {AtomikKFardEGameRoom} La salle mise à jour.
     */
    playerReady(room, playerId, isReady) {
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
            this.startRound(room.id); // Démarre le premier round
        }
        return room; // Retourne l'objet interne, la conversion se fera à l'envoi
    }
    /**
     * @public
     * @description Permet à un joueur de jouer une carte sur une case de la grille.
     * Cette méthode est maintenant une méthode d'instance.
     * @param {AtomikKFardEGameRoom} room La salle de jeu.
     * @param {string} playerId L'ID du joueur.
     * @param {AtomikCard} card La carte jouée.
     * @param {CellCoordinates} coordinates Les coordonnées (r, c) de la case.
     * @returns {AtomikKFardEGameRoom} La salle de jeu mise à jour.
     * @throws {Error} Si ce n'est pas le tour du joueur, la carte n'est pas dans sa main, ou la case est déjà occupée.
     */
    playCard(room, playerId, card, coordinates) {
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
        if (!player.hand.some(c => c.id === card.id)) { // Comparaison par ID pour les cartes
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
        // Retirer la carte de la main du joueur
        player.hand = player.hand.filter(c => c.id !== card.id); // Filtrer par ID
        this.moveToNextPlayerTurn(room); // Utilise this car c'est une méthode de l'instance
        const allPlayersPlayed = room.players.every(p => room.playerStates[p.id]?.hasPlayedThisRound);
        if (allPlayersPlayed) {
            this.resolveCurrentRound(room); // Utilise this car c'est une méthode de l'instance
        }
        return room; // Retourne l'objet interne, la conversion se fera à l'envoi
    }
    /**
     * @function handlePlayerJoin
     * @description Gère la connexion d'un joueur à une salle de jeu existante ou en crée une nouvelle.
     * @param {string} roomId L'ID de la salle à rejoindre ou à créer.
     * @param {string} username Le nom d'utilisateur du joueur.
     * @param {string} socketId L'ID du socket du joueur.
     * @returns {AtomikKFardEGameRoom} L'objet salle de jeu mis à jour.
     * @throws {Error} Si la salle est pleine ou si une autre erreur survient.
     */
    handlePlayerJoin(roomId, username, socketId) {
        let room = this.rooms.get(roomId);
        // 1. Vérifier si la salle existe. Sinon, la créer.
        if (!room) {
            const defaultGameOptions = {
                nbPlayer: 'duo', // Cast pour s'assurer du type littéral
                mode: 'Stratege',
                option: 'Sonic',
                teamMode: 'Random',
                gameStyle: 'Conquête',
                timePerRound: 60, // 60 secondes
                maxRounds: 10,
                scoreToWin: 100,
            };
            // Créer une nouvelle salle
            room = {
                id: roomId,
                ownerId: '', // L'ID du créateur sera assigné au premier joueur qui rejoint
                name: `Salle de ${username}`, // Nom par défaut
                players: [],
                state: 'waitingForPlayers', // État initial
                winnerId: null,
                currentRound: 0,
                maxRounds: defaultGameOptions.maxRounds, // Correspond à l'option par défaut
                currentPlayerTurn: '', // Sera défini au démarrage de la partie
                roundTimerInterval: null,
                timePerRound: defaultGameOptions.timePerRound, // Correspond à l'option par défaut
                currentRoundTimer: null,
                currentRoundTimeLeft: defaultGameOptions.timePerRound / 1000, // Temps en secondes
                gameType: 'AtomikKFardE',
                maxPlayers: MAX_PLAYERS_PER_ROOM, // Ou `defaultGameOptions.nbPlayer === 'duo' ? 2 : ...`
                gameOptions: defaultGameOptions, // Assignation de l'objet d'options par défaut
                deck: [],
                discardPile: [],
                grid: [],
                playerGrids: {}, // Initialise un objet vide
                scores: {}, // Initialise un objet vide pour les scores des joueurs
                team1Players: [],
                team2Players: [],
                team1Score: 0,
                team2Score: 0,
                team1ControlledCellsTotal: 0,
                team2ControlledCellsTotal: 0,
                roundResults: [], // Initialise un tableau vide
                playerStates: {}, // Initialise un objet vide
                teams: {
                    player1: [],
                    player2: []
                },
                bombPropagationOrigin: null,
                cafardBombPlayer1PropagationOrigin: null,
                cafardBombPlayer2PropagationOrigin: null,
                turnPassTimer: null,
                playerDisconnectTimers: new Map(), // Initialise une nouvelle Map
                gameHistory: [],
            };
            this.rooms.set(roomId, room);
            console.log(`Salle '${roomId}' créée par ${username}.`);
        }
        // 2. Vérifier si le joueur est déjà dans la salle (par socketId)
        const existingPlayer = room.players.find(p => p.socketId === socketId);
        if (existingPlayer) {
            console.log(`Joueur '${username}' (socket: ${socketId}) est déjà dans la salle '${roomId}'.`);
            return room; // Retourne la salle existante sans modification
        }
        // 3. Vérifier si la salle est pleine
        if (room.players.length >= room.maxPlayers) {
            throw new Error(`La salle '${roomId}' est pleine. Impossible de rejoindre.`);
        }
        // 4. Ajouter le nouveau joueur
        // CORRECTION: Utilisation de AtomikKFardEPlayer au lieu de Player générique
        const newPlayer = {
            // Utilise un ID persistant si tu gères les utilisateurs en DB, sinon un simple UUID
            gameType: 'AtomikKFardE',
            id: `player-${socketId}`, // uuidv4() si tu utilises la lib uuid
            username: username,
            socketId: socketId,
            roomId: roomId,
            status: 'connected',
            hand: [], // La main sera piochée au démarrage de la partie
            deck: [], // Initialisation vide requise
            score: 0,
            isConnected: true,
            isReady: false, // Le joueur n'est pas prêt par défaut
        };
        room.players.push(newPlayer);
        console.log(`Joueur '${username}' (socket: ${socketId}) a rejoint la salle '${roomId}'. Joueurs: ${room.players.length}/${room.maxPlayers}`);
        // 5. Si la salle atteint le nombre de joueurs max, démarrer la partie
        if (room.players.length === room.maxPlayers) {
            console.log(`Salle '${roomId}' pleine. Démarrage de la partie...`);
            this.startGame(room); // Appelle une fonction pour initialiser la partie
        }
        return room;
    }
    /**
     * @function handlePlayerLeave
     * @description Gère le départ d'un joueur d'une salle.
     * @param {string} socketId L'ID du socket du joueur qui quitte.
     * @returns {string | null} L'ID de la salle quittée, ou null si aucune salle n'est trouvée.
     */
    handlePlayerLeave(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const initialPlayerCount = room.players.length;
            room.players = room.players.filter(p => p.socketId !== socketId);
            if (room.players.length < initialPlayerCount) {
                console.log(`Joueur (socket: ${socketId}) a quitté la salle '${roomId}'. Reste ${room.players.length} joueurs.`);
                // Si la salle est vide après le départ, on peut la supprimer
                if (room.players.length === 0) {
                    this.rooms.delete(roomId);
                    console.log(`Salle '${roomId}' est vide et a été supprimée.`);
                }
                return roomId;
            }
        }
        return null; // Le joueur n'était dans aucune salle
    }
    /**
     * @private
     * @function startGame
     * @description Initialise une partie pour la salle donnée.
     * Ceci est une fonction interne appelée lorsque la salle est pleine.
     * @param {AtomikKFardEGameRoom} room La salle de jeu à démarrer.
     */
    startGame(room) {
        console.log(`Initialisation de la partie pour la salle '${room.id}'.`);
        // 1. Définir le mode de jeu et l'option (si non déjà définis, ou choisir par défaut)
        // Pour l'exemple, nous utilisons les valeurs par défaut de la création de la salle.
        // En production, tu pourrais avoir une interface où le créateur de la salle choisit ces options.
        // 2. Générer le deck complet
        room.deck = AtomikKFardELogic.generateFullDeck(room.gameOptions.mode, room.gameOptions.option);
        room.deck = AtomikKFardELogic.shuffleDeck(room.deck);
        console.log(`Deck généré et mélangé avec ${room.deck.length} cartes.`);
        // 3. Initialiser la grille
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);
        console.log(`Grille de jeu (${room.grid.length}x${room.grid[0].length}) créée.`);
        // 4. Distribuer les mains initiales aux joueurs
        room.players.forEach(player => {
            // Piocher 7 cartes pour la main initiale de chaque joueur
            player.hand = AtomikKFardELogic.drawNewHand([], room.deck, [], []); // drawNewHand gère la pioche
            console.log(`Main initiale de ${player.username}: ${player.hand.length} cartes.`);
        });
        // 5. Définir le premier joueur
        room.currentRound = 1;
        // Ici, tu pourrais émettre un événement WebSocket pour notifier les joueurs que la partie a commencé
        // et leur envoyer l'état initial de la salle.
        // Exemple (si tu as un serveur WebSocket dans ce manager):
        // this.io.to(room.id).emit('gameStarted', room);
    }
    // Tu pourrais ajouter d'autres méthodes ici :
    // - handlePlayerReady(socketId: string): AtomikKFardEGameRoom
    // - handlePlayerPlayCard(socketId: string, cardId: string, coordinates: CellCoordinates): AtomikKFardEGameRoom
    // - handleEndTurn(socketId: string): AtomikKFardEGameRoom
    // - getRoomState(roomId: string): AtomikKFardEGameRoom | undefined
    // - saveRoomState(room: AtomikKFardEGameRoom): Promise<void> // Pour la persistance en DB
    /**
     * @private
     * @description Gère le passage au joueur suivant dans la salle.
     * Cette méthode est maintenant une méthode d'instance.
     * @param {AtomikKFardEGameRoom} room La salle de jeu.
     */
    moveToNextPlayerTurn(room) {
        const currentPlayerIndex = room.players.findIndex(p => p.id === room.currentPlayerTurn);
        let nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
        let attempts = 0;
        while (room.playerStates[room.players[nextPlayerIndex].id]?.hasPlayedThisRound && attempts < room.players.length) {
            nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
            attempts++;
        }
        room.currentPlayerTurn = room.players[nextPlayerIndex].id;
    }
    /**
     * @public
     * @description Résout le round actuel du jeu, met à jour la grille et les scores.
     * Appelle la logique de résolution du mode de jeu (ici, conquête).
     * Cette méthode est maintenant une méthode d'instance.
     * @param {AtomikKFardEGameRoom} room La salle de jeu à résoudre.
     * @returns {AtomikKFardEGameRoom} La salle de jeu mise à jour avec les résultats du round.
     */
    resolveCurrentRound(room) {
        if (room.state !== 'inGame') {
            throw new Error("Impossible de résoudre le round, le jeu n'est pas en cours.");
        }
        const allPlayersPlayed = room.players.every(p => room.playerStates[p.id]?.hasPlayedThisRound);
        if (!allPlayersPlayed) {
            throw new Error("Tous les joueurs n'ont pas encore soumis leurs cartes pour ce round.");
        }
        let player1CombinedGrid;
        let player2CombinedGrid;
        if (room.players.length === 2) {
            player1CombinedGrid = room.playerGrids[room.teams.player1[0]];
            player2CombinedGrid = room.playerGrids[room.teams.player2[0]];
        }
        else {
            const { team1CombinedGrid, team2CombinedGrid } = AtomikKFardELogic.fuseTeamGrids(room.playerGrids, room.teams.player1, room.teams.player2, room.gameOptions.option);
            player1CombinedGrid = team1CombinedGrid;
            player2CombinedGrid = team2CombinedGrid;
        }
        if (!player1CombinedGrid || !player2CombinedGrid) {
            console.error("Grilles combinées manquantes pour la résolution du round.");
            throw new Error("Erreur: Grilles combinées manquantes pour la résolution du round.");
        }
        const roundResult = AtomikKFardELogic.resolveConquestRound(player1CombinedGrid, player2CombinedGrid, room.gameOptions.option);
        room.grid = roundResult.finalBoardState;
        room.roundResults.push(roundResult);
        const p1 = room.players.find(p => p.id === room.teams.player1[0]);
        if (p1)
            p1.score += roundResult.player1TotalScore;
        const p2 = room.players.find(p => p.id === room.teams.player2[0]);
        if (p2)
            p2.score += roundResult.player2TotalScore;
        for (const card of roundResult.cardsToStealFromPlayer1 || []) { // Ajout || [] pour sécurité
            const stealingPlayer = p2;
            if (stealingPlayer && stealingPlayer.hand)
                stealingPlayer.hand.push(card);
        }
        for (const card of roundResult.cardsToStealFromPlayer2 || []) { // Ajout || [] pour sécurité
            const stealingPlayer = p1;
            if (stealingPlayer && stealingPlayer.hand)
                stealingPlayer.hand.push(card);
        }
        room.discardPile = (room.discardPile || []).concat(roundResult.cardsToLoseForTie || []); // Ajout || []
        for (const player of room.players) {
            player.hand = AtomikKFardELogic.drawNewHand(player.hand || [], room.deck, [], []); // Ajout || []
        }
        if (room.currentRound >= (room.gameOptions.maxRounds || 10)) { // Utiliser gameOptions.maxRounds
            room.state = 'gameOver';
            if (p1 && p2) {
                if (p1.score > p2.score) {
                    room.winnerId = p1.id;
                }
                else if (p2.score > p1.score) {
                    room.winnerId = p2.id;
                }
                else {
                    room.winnerId = 'tie';
                }
            }
        }
        else {
            room.currentRound++;
            room.playerGrids = {};
            for (const pId in room.playerStates) {
                room.playerStates[pId] = { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false };
            }
            room.currentPlayerTurn = room.players[0].id;
            this.startRound(room.id); // Démarre le round suivant après résolution
        }
        return room; // Retourne l'objet interne, la conversion se fera à l'envoi
    }
    /**
     * @public
     * @description Renvoie l'état actuel de la salle de jeu.
     * Cette méthode est maintenant une méthode d'instance et utilise this.rooms.
     * @param {string} roomId L'ID de la salle.
     * @returns {AtomikKFardEGameRoom | undefined} La salle de jeu ou undefined si non trouvée.
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    /**
     * @public
     * @description Retourne tous les salons AtomikKFardE gérés par ce manager.
     * Cette méthode est maintenant une méthode d'instance.
     * @returns {AtomikKFardEGameRoom[]} Un tableau de tous les salons.
     */
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    /**
     * @public
     * @description Notifie le manager qu'un joueur s'est déconnecté.
     * @param {string} socketId L'ID du socket qui s'est déconnecté.
     * @param {string} roomId L'ID du salon concerné.
     */
    notifyPlayerDisconnect(socketId, roomId) {
        const room = this.rooms.get(roomId); // Utilise this.rooms
        if (!room)
            return;
        const playerToDisconnect = room.players.find(p => p.id === socketId);
        if (!playerToDisconnect) {
            console.warn(`[AtomikKfardE] Joueur avec socket ID ${socketId} non trouvé dans le salon ${roomId} lors de la déconnexion.`);
            return;
        }
        if (playerToDisconnect.status === 'connected') {
            playerToDisconnect.status = 'disconnected_temp';
            console.log(`[AtomikKFardE] Joueur ${playerToDisconnect.username} (${socketId}) marqué 'disconnected_temp' du salon AtomikKFardE ${roomId}.`);
            if (room.playerDisconnectTimers.has(playerToDisconnect.username)) {
                clearTimeout(room.playerDisconnectTimers.get(playerToDisconnect.username));
                room.playerDisconnectTimers.delete(playerToDisconnect.username);
                console.log(`[CrazyMorpionManager - DEBUG] Annulation d'un minuteur existant pour ${playerToDisconnect.username}.`);
            }
            const graceTimer = setTimeout(() => {
                const currentRoom = this.rooms.get(roomId); // Utilise this.rooms
                if (currentRoom) {
                    const playerStillTempDisconnected = currentRoom.players.find(p => p.username === playerToDisconnect.username && p.status === 'disconnected_temp');
                    if (playerStillTempDisconnected) {
                        playerStillTempDisconnected.status = 'disconnected';
                        console.log(`[AtomikKFardE] Minuteur expiré: ${playerToDisconnect.username} est définitivement déconnecté. Passage du tour si nécessaire.`);
                    }
                }
                room.playerDisconnectTimers.delete(playerToDisconnect.username);
            }, PLAYER_RECONNECT_SHORT_GRACE_PERIOD_MS);
            room.playerDisconnectTimers.set(playerToDisconnect.username, graceTimer);
            console.log(`[AtomikKfardE] Minuteur de grâce de reconnexion démarré pour ${playerToDisconnect.username} au salon ${roomId}.`);
        }
        else if (playerToDisconnect.status === 'disconnected_temp') {
            console.log(`[AtomikKfardE] Joueur ${playerToDisconnect.username} (${socketId}) est déjà en statut 'disconnected_temp'.`);
        }
        else if (playerToDisconnect.status === 'disconnected') {
            console.log(`[AtomikKfardEManager] Joueur ${playerToDisconnect.username} (${socketId}) est déjà définitivement déconnecté. Aucune action.`);
        }
    }
    /**
     * @public
     * @description Gère une demande de redémarrage de partie.
     * Réinitialise l'état du salon et lance un nouveau round si possible.
     * @param {string} roomId L'ID du salon.
     * @param {string} requestingPlayerId L'ID du socket du joueur qui demande le redémarrage.
     * @returns {AtomikKFardEGameRoom | undefined} Le salon mis à jour, ou `undefined` si le salon est plein ou n'existe pas.
     */
    handleRestartRequest(roomId, requestingPlayerId) {
        console.log(`[AtomikKFardEManager] handleRestartRequest: Demande de redémarrage pour le salon ${roomId} par ${requestingPlayerId}.`);
        const room = this.rooms.get(roomId); // <-- Utilise this.rooms
        if (!room) {
            this.io.to(requestingPlayerId).emit('error:message', 'Salon non trouvé.');
            console.warn(`[AtomikKFardE] handleRestartRequest: Salon ${roomId} non trouvé.`);
            return undefined;
        }
        const requestingPlayer = room.players.find(p => p.id === requestingPlayerId && p.status === 'connected');
        if (!requestingPlayer) {
            this.io.to(requestingPlayerId).emit('error:message', 'Vous devez être connecté au salon pour demander un redémarrage.');
            console.warn(`[AtomikKFardEManager] handleRestartRequest: Joueur ${requestingPlayerId} non trouvé ou non connecté dans le salon ${roomId}.`);
            return undefined;
        }
        // Arrêter les timers existants
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
            console.log(`[AtomikKFardEManager] handleRestartRequest: Ancien timer du round pour le salon ${roomId} arrêté.`);
        }
        room.playerDisconnectTimers.forEach(timer => clearTimeout(timer));
        room.playerDisconnectTimers.clear();
        // Réinitialiser les propriétés de la salle
        // Garde les options de jeu existantes (nbPlayer, mode, option, etc.)
        const initialGameOptions = { ...room.gameOptions }; // Copie les options existantes
        const initialMaxPlayers = room.maxPlayers;
        const initialRoomName = room.name;
        // Réinitialiser la salle avec un état propre
        // La recréer en fait comme si on créait une nouvelle salle
        const newDeck = AtomikKFardELogic.shuffleDeck(AtomikKFardELogic.generateFullDeck(initialGameOptions.mode, initialGameOptions.option));
        // CORRECTION: Utilisation de AtomikKFardEPlayer au lieu de Player générique
        const hostPlayer = {
            gameType: 'AtomikKFardE',
            roomId: roomId,
            status: 'connected',
            socketId: '',
            id: requestingPlayerId,
            username: requestingPlayer.username,
            hand: AtomikKFardELogic.drawNewHand([], newDeck, [], []), // Nouvelle main
            deck: [], // Initialisation vide requise
            score: 0,
            isConnected: true,
            isReady: false,
        };
        room.ownerId = requestingPlayerId;
        room.name = initialRoomName; // Garde le nom original de la salle
        room.players = [hostPlayer]; // L'hôte est le seul joueur initial
        room.state = 'waitingForPlayers';
        room.winnerId = null;
        room.roundTimerInterval = null;
        room.currentRound = 0;
        room.maxRounds = initialGameOptions.maxRounds || 10;
        room.currentPlayerTurn = ''; // Sera défini au démarrage du jeu
        room.timePerRound = initialGameOptions.timePerRound || 30;
        room.currentRoundTimer = null;
        room.currentRoundTimeLeft = (initialGameOptions.timePerRound || 30);
        room.gameType = 'AtomikKFardE';
        room.maxPlayers = initialMaxPlayers; // Garde le nombre max de joueurs
        room.gameOptions = initialGameOptions; // Garde les options de jeu
        room.deck = newDeck;
        room.discardPile = [];
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(initialGameOptions.option); // Re-crée la grille
        room.playerGrids = {};
        room.scores = { [requestingPlayerId]: 0 };
        room.team1Players = [requestingPlayerId];
        room.team2Players = [];
        room.team1Score = 0;
        room.team2Score = 0;
        room.team1ControlledCellsTotal = 0;
        room.team2ControlledCellsTotal = 0;
        room.roundResults = [];
        room.playerStates = {
            [requestingPlayerId]: { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false }
        };
        room.teams = {
            player1: [requestingPlayerId],
            player2: []
        };
        room.bombPropagationOrigin = null;
        room.cafardBombPlayer1PropagationOrigin = null;
        room.cafardBombPlayer2PropagationOrigin = null;
        room.turnPassTimer = null;
        room.playerDisconnectTimers = new Map();
        room.gameHistory = [];
        console.log(`[AtomikKFardEManager] handleRestartRequest: Salon ${roomId} réinitialisé.`);
        // Il faut ré-ajouter les autres joueurs qui étaient présents dans le salon avant le redémarrage
        // et qui sont toujours connectés. C'est un scénario complexe à gérer automatiquement,
        // souvent, un redémarrage signifie que tous les joueurs doivent "rejoindre" la salle ou "se ready" à nouveau.
        // Pour l'instant, seul l'hôte est là.
        // Si d'autres joueurs doivent être inclus, il faut itérer sur les joueurs 'connected'
        // et les ajouter à la nouvelle room, en distribuant leurs cartes.
        // Ou, plus simple : tous les joueurs doivent se re-ready (ils recevront un "roomUpdated").
        this.io.to(roomId).emit('game:restart', this.toClientRoom(room)); // Utilise this.toClientRoom
        this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r))); // Utilise this.rooms et this.toClientRoom
        return room;
    }
    /**
     * @private
     * @description Démarre un nouveau round de jeu AtomikKFardE.
     * Sélectionne un nouveau drapeau, réinitialise le timer et les réponses des joueurs.
     * @param {string} roomId L'ID du salon.
     */
    startRound(roomId) {
        console.log(`[AtomikKFardEManager] startRound: Appel pour le salon ${roomId}.`);
        const room = this.rooms.get(roomId); // <-- Utilise this.rooms
        if (!room || room.state !== 'inGame') {
            console.warn(`[AtomikKFardEManager] startRound: Impossible de démarrer le round : salon ${roomId} inactif ou non trouvé.`);
            return;
        }
        // Incrémente le round UNIQUEMENT au début d'un nouveau round, pas à la fin
        // Sauf si currentRound est 0, alors c'est le 1er round.
        if (room.currentRound === 0 || room.roundResults.length > 0) { // Si c'est le tout début, ou si un round vient d'être résolu
            room.currentRound++;
        }
        // Arrêtez TOUJOURS l'ancien intervalle avant d'en créer un nouveau.
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
            console.log(`[AtomikKFardEManager] startRound: Ancien timer du round pour le salon ${roomId} arrêté.`);
        }
        // Réinitialise l'état des joueurs pour le nouveau round
        for (const pId in room.playerStates) {
            room.playerStates[pId] = { hasPlayedThisRound: false, playedCard: null, playedCoordinates: null, submittedGrid: [], hasSubmitted: false };
        }
        room.playerGrids = {}; // Réinitialise les grilles jouées par les joueurs
        room.currentRoundTimeLeft = (room.gameOptions.timePerRound || 30000) / 1000; // Initialise le temps du round
        room.grid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option); // Re-crée la grille vide pour le nouveau round
        // Distribuer de nouvelles cartes si nécessaire (après résolution/avant le nouveau round)
        for (const player of room.players) {
            player.hand = AtomikKFardELogic.drawNewHand(player.hand || [], room.deck, [], []);
        }
        // Définir le premier joueur du nouveau round (ex: le premier joueur de la liste, ou alterner)
        room.currentPlayerTurn = room.players[0].id;
        let currentRoundIntervalId = null;
        currentRoundIntervalId = setInterval(() => {
            const currentRoomInstance = this.rooms.get(roomId); // <-- Utilise this.rooms
            if (!currentRoomInstance) {
                if (currentRoundIntervalId !== null) {
                    clearInterval(currentRoundIntervalId);
                    console.warn(`[AtomikKFardEManager] Timer (ID: ${currentRoundIntervalId}) pour le salon supprimé ${roomId} nettoyé.`);
                }
                return;
            }
            currentRoomInstance.currentRoundTimeLeft--;
            this.io.to(roomId).emit('atomikkfarde:countdown', currentRoomInstance.currentRoundTimeLeft);
            if (currentRoomInstance.currentRoundTimeLeft <= 0) {
                console.log(`[AtomikKFardEManager] startRound: Minuteur de round terminé pour le salon ${roomId}.`);
                this.endRound(roomId);
            }
        }, 1000); // Le timer décompte toutes les SECONDES (1000ms)
        room.roundTimerInterval = currentRoundIntervalId;
        this.io.to(roomId).emit('game:new-round', this.toClientRoom(room)); // Envoyer l'état complet de la salle
        this.io.emit('room:list', Array.from(this.rooms.values()).map(r => this.toClientRoom(r)));
    }
    /**
     * @function startRoundTimer
     * @description Démarre le timer pour le round actuel.
     * @param {string} roomId L'ID de la salle.
     */
    startRoundTimer(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        if (room.currentRoundTimer) {
            clearInterval(room.currentRoundTimer);
        }
        room.currentRoundTimeLeft = room.gameOptions.timePerRound; // En secondes
        room.currentRoundTimer = setInterval(() => {
            room.currentRoundTimeLeft--;
            // ✅ DIFFUSION DU TEMPS RESTANT AUX CLIENTS DÉCOMMENTÉE ET ACTIVE
            this.io.to(roomId).emit('atomikkfarde:countdown', room.currentRoundTimeLeft);
            if (room.currentRoundTimeLeft <= 0) {
                clearInterval(room.currentRoundTimer);
                room.currentRoundTimer = null;
                console.log(`Fin du temps pour le round ${room.currentRound} dans la salle ${roomId}.`);
                this.endRound(roomId);
            }
        }, 1000);
    }
    /**
     * @function handleMakeMove
     * @description Traite l'action d'un joueur (ex: jouer une carte).
     * C'est la fonction principale pour les interactions en jeu.
     * @param {string} roomId L'ID de la salle de jeu.
     * @param {string} playerId L'ID du joueur qui fait l'action.
     * @param {PlayerAction} action L'objet décrivant l'action à effectuer.
     * @returns {AtomikKFardEGameRoom} L'état mis à jour de la salle de jeu.
     * @throws {Error} Si le coup est invalide, ce n'est pas le tour du joueur, etc.
     */
    handleMakeMove(roomId, playerId, action) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Salle de jeu ${roomId} introuvable.`);
        }
        const player = room.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error(`Joueur ${playerId} introuvable dans la salle ${roomId}.`);
        }
        // 1. Vérifications de base (est-ce le tour du joueur, etc.)
        if (room.state !== 'inGame') {
            throw new Error(`La partie n'est pas en cours dans la salle ${roomId}.`);
        }
        // Pour les jeux au tour par tour :
        // if (room.currentPlayerTurn !== playerId) {
        //     throw new Error(`Ce n'est pas le tour de ${player.username}.`);
        // }
        // Pour les jeux où tout le monde joue en même temps puis on résout (comme la conquête, où chacun soumet sa grille) :
        // La vérification de tour n'est pas nécessaire ici, mais plutôt une vérification si le joueur a déjà soumis.
        if (room.playerStates[playerId]?.hasSubmitted) {
            throw new Error(`${player.username} a déjà soumis sa grille pour ce round.`);
        }
        switch (action.type) {
            case 'playCard':
                const { cardId, r, c } = action.payload;
                // 1. Trouver la carte dans la main du joueur
                const cardIndexInHand = player.hand.findIndex(card => card.id === cardId);
                if (cardIndexInHand === -1) {
                    throw new Error(`Carte ${cardId} introuvable dans la main de ${player.username}.`);
                }
                const cardToPlay = player.hand[cardIndexInHand];
                // 2. Vérifier la validité des coordonnées (doivent être dans la grille)
                if (r < 0 || r >= room.grid.length || c < 0 || c >= room.grid[0].length) {
                    throw new Error(`Coordonnées (${r},${c}) hors limites de la grille.`);
                }
                // 3. Vérifier si la cellule est déjà occupée par ce joueur pour ce round
                // (Important pour le mode où les joueurs remplissent leur grille avant soumission)
                if (room.playerStates[playerId]?.submittedGrid[r][c]?.card !== null) {
                    throw new Error(`La cellule (${r},${c}) est déjà occupée sur la grille soumise par ${player.username}.`);
                }
                // 4. Placer la carte sur la grille soumise temporairement par le joueur
                // On retire la carte de la main du joueur
                player.hand.splice(cardIndexInHand, 1);
                // Et on la place sur la grille soumise du joueur
                room.playerStates[playerId].submittedGrid[r][c] = {
                    ...room.playerStates[playerId].submittedGrid[r][c], // Garde les propriétés existantes
                    card: cardToPlay,
                    owner: player.id === room.team1Players[0] ? CellOwner.Player1 : CellOwner.Player2, // Simplifié pour 2 joueurs/équipes
                    // La couleur et l'owner temporaire peuvent être définis pour le feedback client,
                    // mais la vraie résolution se fait à la fin du round.
                };
                console.log(`${player.username} a joué ${cardToPlay.type} (${cardToPlay.id}) en (${r},${c}).`);
                // 5. Marquer le joueur comme ayant joué cette carte (ou soumis sa grille s'il a rempli tout ce qu'il pouvait)
                // Ici, on pourrait vérifier si le joueur a joué toutes ses cartes ou a le droit de soumettre sa grille.
                // Pour l'exemple, nous allons juste marquer qu'une action a été faite.
                // Si la soumission de grille est une action distincte:
                // room.playerStates[playerId].hasSubmitted = true; // Si l'action 'playCard' signifie "j'ai fini de placer toutes mes cartes"
                // Si tu as un concept de "valider son tour" ou "valider sa grille", ce n'est pas le `playCard` qui marque `hasSubmitted`.
                // Mais si chaque 'playCard' est une soumission partielle, alors `hasSubmitted` est pour la soumission finale.
                break;
            default:
                throw new Error(`Type d'action inconnu: ${action.type}`);
        }
        // Optionnel: Déclenche un événement de vérification de fin de round si tous les joueurs ont soumis leur grille
        const allPlayersSubmitted = room.players.every(p => room.playerStates[p.id]?.hasSubmitted);
        if (allPlayersSubmitted) {
            console.log(`Tous les joueurs de la salle ${roomId} ont soumis leurs grilles. Résolution du round.`);
            this.endRound(roomId);
        }
        // Enregistre l'action dans l'historique de jeu (pour audit/replay)
        room.gameHistory.push(`Player ${playerId} performed action ${action.type} at ${new Date().toISOString()}`);
        // Retourne l'état mis à jour de la salle pour que le client puisse être mis à jour
        return room;
    }
    /**
     * @function endRound
     * @description Termine le round actuel, résout les grilles et prépare le prochain round.
     * @param {string} roomId L'ID de la salle.
     */
    endRound(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.state !== 'inGame') {
            console.warn(`Tentative de terminer un round dans un état invalide pour la salle ${roomId}.`);
            return;
        }
        if (room.currentRoundTimer) {
            clearInterval(room.currentRoundTimer);
            room.currentRoundTimer = null;
        }
        console.log(`Résolution du round ${room.currentRound} pour la salle ${roomId}.`);
        // Assurez-vous que les grilles soumises par les joueurs sont utilisées.
        // Pour les parties en équipe, fusez d'abord les grilles d'équipe.
        let player1PlayedGrid;
        let player2PlayedGrid;
        if (room.gameOptions.nbPlayer === 'duo' && room.gameOptions.teamMode !== 'Random') { // Gère le mode équipe
            // Fusion des grilles des joueurs de l'équipe 1 et 2
            // NOTE: Tu dois stocker les ID de joueur dans team1Players et team2Players
            // et t'assurer que playerGrids contient les grilles de CHAQUE joueur.
            // Si la logique `playerStates[playerId].submittedGrid` est pour chaque joueur,
            // alors `fuseTeamGrids` recevra la collection complète de `playerStates[playerId].submittedGrid`.
            // Construire le record de playerSubmittedGrids pour fuseTeamGrids
            const allSubmittedGrids = {};
            room.players.forEach(p => {
                if (room.playerStates[p.id]?.submittedGrid) {
                    allSubmittedGrids[p.id] = room.playerStates[p.id].submittedGrid;
                }
            });
            const { team1CombinedGrid, team2CombinedGrid } = AtomikKFardELogic.fuseTeamGrids(allSubmittedGrids, room.team1Players, room.team2Players, room.gameOptions.option);
            player1PlayedGrid = team1CombinedGrid;
            player2PlayedGrid = team2CombinedGrid;
        }
        else { // Mode individuel (1v1) ou si pas de mode équipe
            // Assumer que le premier joueur dans room.players est P1 et le second P2
            const p1 = room.players[0];
            const p2 = room.players[1];
            if (!p1 || !p2) {
                console.error(`Pas assez de joueurs pour résoudre le round dans la salle ${roomId}.`);
                return;
            }
            player1PlayedGrid = room.playerStates[p1.id].submittedGrid;
            player2PlayedGrid = room.playerStates[p2.id].submittedGrid;
        }
        // Résoudre le round de conquête
        const roundResult = AtomikKFardELogic.resolveConquestRound(player1PlayedGrid, player2PlayedGrid, room.gameOptions.option);
        // Appliquer les résultats à l'état de la salle
        room.grid = roundResult.finalBoardState; // Met à jour la grille principale
        room.roundResults.push(roundResult); // Ajoute le résultat au historique
        // Mettre à jour les scores des joueurs/équipes
        // Cette logique doit être affinée pour gérer correctement les scores individuels vs équipe
        if (room.gameOptions.nbPlayer === 'duo' && room.gameOptions.teamMode !== 'Random') {
            room.team1Score += roundResult.player1TotalScore;
            room.team2Score += roundResult.player2TotalScore;
            room.team1ControlledCellsTotal += roundResult.player1ControlledCells;
            room.team2ControlledCellsTotal += roundResult.player2ControlledCells;
            console.log(`Scores Équipe 1: ${room.team1Score}, Équipe 2: ${room.team2Score}`);
        }
        else {
            // Pour le mode 1v1, les scores du round s'appliquent directement aux joueurs
            const p1 = room.players[0];
            const p2 = room.players[1];
            if (p1)
                room.scores[p1.id] += roundResult.player1TotalScore;
            if (p2)
                room.scores[p2.id] += roundResult.player2TotalScore;
            // Mise à jour des scores individuels des joueurs pour chaque tour dans l'interface Player
            if (p1)
                p1.score = room.scores[p1.id];
            if (p2)
                p2.score = room.scores[p2.id];
            console.log(`Scores Joueur 1: ${room.scores[p1.id]}, Joueur 2: ${room.scores[p2.id]}`);
        }
        // Gérer les cartes volées et défaussées
        roundResult.cardsToStealFromPlayer1.forEach(card => {
            const player = room.players.find(p => p.id === room.team2Players[0]); // Exemple: le premier joueur de l'équipe 2 vole
            if (player) {
                player.hand.push(card); // La carte volée va dans la main du voleur
                // Ne pas supprimer de l'original, car cardsToStealFromPlayer1 contient déjà les cartes à "voler"
                // qui ont été retirées du joueur 1 lors de la résolution (implicitement).
            }
        });
        roundResult.cardsToStealFromPlayer2.forEach(card => {
            const player = room.players.find(p => p.id === room.team1Players[0]); // Exemple: le premier joueur de l'équipe 1 vole
            if (player) {
                player.hand.push(card);
            }
        });
        room.discardPile.push(...roundResult.cardsToLoseForTie); // Les cartes égalisées vont à la défausse
        // Préparer le prochain round ou terminer la partie
        room.currentRound++;
        if (room.currentRound > room.maxRounds || room.team1Score >= room.gameOptions.scoreToWin || room.team2Score >= room.gameOptions.scoreToWin) {
            room.state = 'gameOver';
            room.winnerId = this.determineGameWinner(room);
            console.log(`Partie terminée dans la salle ${roomId}. Vainqueur: ${room.winnerId || 'Aucun'}`);
            // ==========================================
            // 💾 DÉCLENCHEMENT DE L'ARCHIVAGE (MONGO + NEO4J)
            // ==========================================
            // On calcule la durée totale (simplifié: on prend l'heure actuelle moins une "startedAt" fictive pour l'exemple. 
            // L'idéal est d'ajouter une propriété `startedAt: Date` dans AtomikKFardEGameRoom lors de la création de la salle).
            const duration = room.gameOptions.timePerRound * (room.currentRound - 1);
            const matchData = {
                gameType: 'AtomikKFardE',
                roomId: room.id,
                startedAt: new Date(Date.now() - (duration * 1000)), // Date de début calculée
                endedAt: new Date(),
                durationSeconds: duration,
                players: room.players.map(p => {
                    const isWin = room.winnerId === p.id ||
                        (room.winnerId === 'Team1' && room.teams.player1.includes(p.id)) ||
                        (room.winnerId === 'Team2' && room.teams.player2.includes(p.id));
                    return {
                        uid: p.id, // Assure-toi que p.id contient bien l'UID réel de la base de données
                        pseudo: p.username,
                        score: room.scores[p.id] || 0,
                        isWinner: isWin,
                        specificStats: {
                            // On pourrait ajouter des stats spécifiques d'Atomik ici
                            cardsPlayed: room.currentRound - 1
                        }
                    };
                }),
                matchMetadata: {
                    gridOption: room.gameOptions.option,
                    teamMode: room.gameOptions.teamMode,
                    totalRounds: room.currentRound - 1
                }
            };
            // On lance l'archivage en tâche de fond (Fire and Forget) pour ne pas bloquer le serveur
            // ✅ FIX: TYPAGE DE LA PROMESSE POUR RÉSOUDRE L'ERREUR ANY
            GameStatsService.recordMatch(matchData).then((success) => {
                if (success)
                    console.log(`[AtomikKFardEManager] Historique sauvegardé avec succès pour la salle ${roomId}`);
            });
            // ==========================================
            // ✅ EMISSION EVENT: Fin de partie DÉCOMMENTÉE ET ACTIVE
            this.io.to(roomId).emit('game:over', this.toClientRoom(room));
        }
        else {
            // Réinitialiser les états des joueurs pour le nouveau round
            room.players.forEach(p => {
                room.playerStates[p.id].submittedGrid = AtomikKFardELogic.createEmptyAtomikKFardEGrid(room.gameOptions.option);
                room.playerStates[p.id].hasSubmitted = false;
                // Piocher de nouvelles cartes si besoin (géré par drawNewHand)
                p.hand = AtomikKFardELogic.drawNewHand(p.hand, room.deck, [], []);
            });
            console.log(`Début du round ${room.currentRound} dans la salle ${roomId}.`);
            // Redémarrer le timer
            this.startRoundTimer(roomId);
            // ✅ EMISSION EVENT: Nouveau round DÉCOMMENTÉE ET ACTIVE
            this.io.to(roomId).emit('game:new-round', this.toClientRoom(room));
        }
        // ✅ EMISSION EVENT: Mise à jour globale DÉCOMMENTÉE ET ACTIVE
        this.io.to(roomId).emit('room:updated', this.toClientRoom(room));
    }
    /**
     * @private
     * @function determineGameWinner
     * @description Détermine le vainqueur final de la partie.
     * @param {AtomikKFardEGameRoom} room La salle de jeu.
     * @returns {string | null} L'ID du vainqueur (joueur ou équipe), ou null en cas d'égalité.
     */
    determineGameWinner(room) {
        if (room.gameOptions.nbPlayer === 'duo' && room.gameOptions.teamMode !== 'Random') {
            if (room.team1Score > room.team2Score)
                return 'Team1';
            if (room.team2Score > room.team1Score)
                return 'Team2';
            return null; // Égalité des équipes
        }
        else {
            // Pour le mode 1v1 ou sans équipe, compare les scores des joueurs
            const p1 = room.players[0];
            const p2 = room.players[1];
            if (!p1 || !p2)
                return null; // Pas assez de joueurs
            if (room.scores[p1.id] > room.scores[p2.id])
                return p1.id;
            if (room.scores[p2.id] > room.scores[p1.id])
                return p2.id;
            return null; // Égalité des joueurs
        }
    }
    getRoomState(roomId) {
        return this.rooms.get(roomId);
    }
    /**
     * @public
     * @description Convertit l'état interne du salon en un format sûr pour le client.
     * Cette méthode est CRUCIALE pour AtomikKFardE.
     * Elle masque les informations sensibles (comme le deck complet du manager ou les mains complètes des joueurs).
     * @param {AtomikKFardEGameRoom} room L'objet de salon interne.
     * @returns {AtomikKFardERoomToSend} L'objet de salon formaté pour le client.
     */
    toClientRoom(room) {
        const playersToSend = room.players.map(p => ({
            hand: p.hand,
            id: p.id,
            socketId: p.socketId,
            username: p.username,
            score: p.score,
            roomId: room.id,
            status: p.isConnected ? 'connected' : 'disconnected',
            isReady: p.isReady,
            handSize: p.hand?.length || 0,
            deck: p.deck
        }));
        // NOTE: player1Hand et player2Hand devraient idéalement être nuls ou [] par défaut
        // et n'être remplis QUE par toClientRoomForPlayer pour éviter la triche.
        // Pour l'instant, je les laisse car ils sont dans ton type, mais garde ça en tête.
        const player1 = room.players[0];
        const player2 = room.players[1];
        const clientRoom = {
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
            player1Hand: player1 ? player1.hand : [],
            player2Hand: player2 ? player2.hand : [],
            team1ControlledCellsTotal: room.team1ControlledCellsTotal,
            team2ControlledCellsTotal: room.team2ControlledCellsTotal,
            currentRoundTimeLeft: room.currentRoundTimeLeft,
        };
        return clientRoom;
    }
    /**
     * @public
     * @description Convertit l'état interne du salon pour un joueur spécifique, incluant sa propre main.
     * @param {AtomikKFardEGameRoom} room L'objet de salon interne.
     * @param {string} playerId L'ID du joueur pour qui préparer la vue.
     * @returns {AtomikKFardERoomToSend} L'objet de salon formaté pour le client spécifique.
     */
    toClientRoomForPlayer(room, playerId) {
        const baseClientRoom = this.toClientRoom(room);
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            // Surcharge la main du joueur spécifique avec ses vraies cartes
            // Si le joueur est le joueur 1 ou le joueur 2 (par index)
            if (room.players[0]?.id === playerId) {
                baseClientRoom.player1Hand = player.hand;
            }
            else if (room.players[1]?.id === playerId) {
                baseClientRoom.player2Hand = player.hand;
            }
            // Si tu as besoin de gérer plus de joueurs ou un modèle plus générique:
            // Tu peux ajouter une propriété `myHand` à `AtomikKFardERoomToSend`
            // et l'affecter ici: (baseClientRoom as any).myHand = player.hand;
            // Et ensuite, côté client, chaque client regarde `myHand` pour sa propre main.
            // Les `player1Hand`, `player2Hand` pourraient alors juste afficher la taille.
        }
        return baseClientRoom;
    }
    /**
    * Supprime un joueur d'une salle de jeu côté serveur.
    * Met à jour le tableau des joueurs dans la salle.
    * @param room L'objet salle de jeu (AtomikKFardEGameRoom)
    * @param playerId L'ID du joueur à supprimer
    * @returns La salle de jeu mise à jour.
    */
    removePlayerFromRoom(room, playerId) {
        // Filtrer les joueurs pour exclure celui qui quitte
        const initialPlayerCount = room.players.length;
        room.players = room.players.filter(player => player.id !== playerId);
        if (room.players.length < initialPlayerCount) {
            console.log(`[AtomikKFardEManager] Joueur ${playerId} retiré de la salle ${room.id}.`);
            // Mettre à jour le statut de la salle si nécessaire, par exemple si elle devient vide
            if (room.players.length === 0) {
                room.state = 'empty';
            }
            // Ici, vous pourriez également gérer la logique si le propriétaire quitte,
            // ou si un joueur vital pour le jeu (par exemple, dans un 2-joueurs) quitte.
        }
        else {
            console.warn(`[AtomikKFardEManager] Tentative de retirer le joueur ${playerId} de la salle ${room.id}, mais le joueur n'a pas été trouvé.`);
        }
        return room;
    }
}
