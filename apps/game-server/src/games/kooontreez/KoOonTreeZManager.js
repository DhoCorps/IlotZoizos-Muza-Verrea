import { KoOonTreezLogic } from '@ilot/shared-core';
const koOonTreeZRooms = new Map();
const ROUND_DURATION_SECONDS = 20;
export class KoOonTreeZManager {
    io;
    constructor(ioInstance) {
        this.io = ioInstance;
        KoOonTreezLogic.fetchCountries().then(() => {
            console.log('[KoOonTreeZManager] Données des pays préchargées avec succès.');
        }).catch((err) => {
            console.error('[KoOonTreeZManager] Erreur lors du préchargement des données des pays:', err);
        });
    }
    createRoom(roomId, roomName, creatorPlayer, options) {
        const targetFlags = this.convertOptionToTargetFlags(options.kooonTreezOption);
        const kooonTreezNbPlayer = options.kooonTreezNbPlayer && options.kooonTreezNbPlayer !== "Choisir le Nombre de Joueur en Jeu" ? options.kooonTreezNbPlayer : 'duo';
        const kooonTreezMode = options.kooonTreezMode && options.kooonTreezMode !== "Choisir un Mode de Jeu" ? options.kooonTreezMode : 'DvsP';
        const kooonTreezOption = options.kooonTreezOption && options.kooonTreezOption !== "Choisir une Option de Jeu" ? options.kooonTreezOption : 'Champ-De-Bataille';
        const kooonTreezSoloMode = options.kooonTreezSoloMode && options.kooonTreezSoloMode !== "Choisir un Mode de Jeu Solo" ? options.kooonTreezSoloMode : 'training';
        const kooonTreezLevel = options.kooonTreezLevel && options.kooonTreezLevel !== "Choisir un Niveau de Jeu" ? options.kooonTreezLevel : 'normal';
        const newRoom = {
            id: roomId,
            name: roomName,
            players: [creatorPlayer],
            state: 'waiting',
            winnerId: null,
            round: 0,
            gameType: 'KoOonTreeZ',
            maxPlayers: this.getMaxPlayersForMode(kooonTreezNbPlayer),
            scores: { [creatorPlayer.id]: 0 },
            kooonTreezNbPlayer, kooonTreezMode, kooonTreezOption, kooonTreezSoloMode, kooonTreezLevel,
            allCountries: KoOonTreezLogic.getAllCountries(),
            usedCountryIds: new Set(),
            currentRoundTimeLeft: ROUND_DURATION_SECONDS,
            roundTimerInterval: null,
            totalFlagsRecognized: 0,
            targetFlagsCount: targetFlags,
            currentFlag: null,
            playersAnsweredThisRound: new Set(),
            correctAnswerGivenThisRound: false,
            lastCorrectAnswererId: null,
            playerDisconnectTimers: new Map(),
            expectedAnswer: null,
        };
        koOonTreeZRooms.set(roomId, newRoom);
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        if (newRoom.kooonTreezNbPlayer === 'solo') {
            this.startGame(roomId);
        }
        return newRoom;
    }
    convertOptionToTargetFlags(option) {
        switch (option) {
            case 'Blitzkrieg': return 5;
            case 'Champ-De-Bataille': return 10;
            case 'Sur-Le-Front': return 15;
            case 'Campagne': return 20;
            case 'Guerre-Totale': return 30;
            default: return 'abandon';
        }
    }
    getMaxPlayersForMode(kooonTreezNbPlayer) {
        switch (kooonTreezNbPlayer) {
            case 'solo': return 1;
            case 'duo': return 2;
            case 'trio': return 3;
            case 'quad': return 4;
            case 'battle-royale': return 8;
            default: return 2;
        }
    }
    handlePlayerJoin(roomId, username, newSocketId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room)
            return undefined;
        let playerEntry = room.players.find((p) => p.username === username);
        if (playerEntry) {
            if (playerEntry.id !== newSocketId) {
                this.io.sockets.sockets.get(playerEntry.id)?.leave(roomId);
                if (room.playerDisconnectTimers.has(playerEntry.id)) {
                    clearTimeout(room.playerDisconnectTimers.get(playerEntry.id));
                    room.playerDisconnectTimers.delete(playerEntry.id);
                }
                playerEntry.id = newSocketId;
            }
            playerEntry.status = 'connected';
        }
        else {
            const connectedPlayersCount = room.players.filter((p) => p.status === 'connected').length;
            if (connectedPlayersCount < room.maxPlayers) {
                playerEntry = {
                    id: newSocketId,
                    username: username,
                    score: 0,
                    roomId: room.id,
                    status: 'connected',
                };
                room.players.push(playerEntry);
                room.scores[playerEntry.id] = 0;
            }
            else {
                this.io.to(newSocketId).emit('error:message', `Le salon ${roomId} est plein.`);
                return undefined;
            }
        }
        const consolidatedPlayersMap = new Map();
        room.players.forEach((p) => {
            const existing = consolidatedPlayersMap.get(p.username);
            if (!existing || p.status === 'connected' || p.id === newSocketId) {
                consolidatedPlayersMap.set(p.username, p);
            }
        });
        room.players = Array.from(consolidatedPlayersMap.values());
        const currentConnectedPlayers = room.players.filter((p) => p.status === 'connected');
        if (room.state === 'waiting') {
            if (room.kooonTreezNbPlayer === 'solo' && currentConnectedPlayers.length === 1) {
                this.startGame(roomId);
            }
            else if (currentConnectedPlayers.length === room.maxPlayers) {
                this.io.to(roomId).emit('room:ready-to-start', this.roomToRoomToSend(room));
            }
            this.io.to(newSocketId).emit('room:joined', this.roomToRoomToSend(room));
        }
        else if (room.state === 'playing') {
            this.io.to(newSocketId).emit('game:update', this.roomToRoomToSend(room));
        }
        else if (room.state === 'gameOver') {
            this.io.to(newSocketId).emit('game:over', this.roomToRoomToSend(room));
        }
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        return room;
    }
    async startGame(roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room || room.state === 'playing')
            return;
        const connectedPlayers = room.players.filter((p) => p.status === 'connected');
        if (connectedPlayers.length < room.maxPlayers) {
            this.io.to(room.id).emit('error:message', `Pas assez de joueurs.`);
            return;
        }
        await KoOonTreezLogic.fetchCountries();
        room.state = 'playing';
        room.round = 0;
        room.totalFlagsRecognized = 0;
        room.usedCountryIds.clear();
        room.players.forEach((p) => room.scores[p.id] = 0);
        this.startRound(roomId);
        this.io.to(roomId).emit('game:init', this.roomToRoomToSend(room));
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
    }
    startRound(roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room || room.state !== 'playing')
            return;
        if (typeof room.targetFlagsCount === 'number' && room.totalFlagsRecognized >= room.targetFlagsCount) {
            this.endGame(roomId, this.getWinnerByScore(room), 'target_reached');
            return;
        }
        room.round++;
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }
        room.currentRoundTimeLeft = ROUND_DURATION_SECONDS;
        room.playersAnsweredThisRound.clear();
        room.correctAnswerGivenThisRound = false;
        room.lastCorrectAnswererId = null;
        const quizQuestion = KoOonTreezLogic.getQuizQuestion(room.kooonTreezLevel, room.kooonTreezMode, room.allCountries, room.usedCountryIds);
        if (!quizQuestion) {
            this.io.to(room.id).emit('error:message', 'Impossible de générer une nouvelle question.');
            this.endGame(roomId, null, 'error');
            return;
        }
        room.currentFlag = quizQuestion.currentFlag;
        room.expectedAnswer = quizQuestion.correctAnswer;
        room.usedCountryIds.add(quizQuestion.currentFlag.id);
        let currentRoundIntervalId = null;
        currentRoundIntervalId = setInterval(() => {
            const currentRoomInstance = koOonTreeZRooms.get(roomId);
            if (!currentRoomInstance) {
                if (currentRoundIntervalId !== null)
                    clearInterval(currentRoundIntervalId);
                return;
            }
            currentRoomInstance.currentRoundTimeLeft--;
            this.io.to(roomId).emit('kooontreez:countdown', currentRoomInstance.currentRoundTimeLeft);
            if (currentRoomInstance.currentRoundTimeLeft <= 0) {
                this.endRound(roomId);
            }
        }, 1000);
        room.roundTimerInterval = currentRoundIntervalId;
        this.io.to(roomId).emit('game:new-question', {
            roomId: room.id,
            round: room.round,
            question: quizQuestion.question,
            options: quizQuestion.options,
            currentFlag: quizQuestion.currentFlag,
            mode: quizQuestion.mode,
        });
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
    }
    endRound(roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room)
            return;
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }
        if (typeof room.targetFlagsCount === 'number' && room.totalFlagsRecognized >= room.targetFlagsCount) {
            this.endGame(roomId, this.getWinnerByScore(room), 'target_reached');
            return;
        }
        const connectedPlayers = room.players.filter((p) => p.status === 'connected');
        if (room.kooonTreezNbPlayer !== 'solo' && connectedPlayers.length <= 1) {
            if (connectedPlayers.length === 1)
                this.endGame(roomId, connectedPlayers[0].id, 'last_player_standing');
            else
                this.endGame(roomId, null, 'interrupted');
            return;
        }
        this.startRound(roomId);
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
    }
    getWinnerByScore(room) {
        let winnerId = null;
        let maxScore = -1;
        let tiedPlayers = [];
        room.players.forEach((player) => {
            const score = room.scores[player.id] || 0;
            if (score > maxScore) {
                maxScore = score;
                winnerId = player.id;
                tiedPlayers = [player.id];
            }
            else if (score === maxScore && score > -1) {
                tiedPlayers.push(player.id);
            }
        });
        return tiedPlayers.length === 1 ? winnerId : null;
    }
    endGame(roomId, winnerId, reason) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room)
            return;
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }
        room.state = 'gameOver';
        room.winnerId = winnerId;
        room.currentFlag = null;
        room.expectedAnswer = null;
        room.playersAnsweredThisRound.clear();
        room.correctAnswerGivenThisRound = false;
        room.lastCorrectAnswererId = null;
        this.io.to(roomId).emit('game:over', this.roomToRoomToSend(room));
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
    }
    handleRestartRequest(roomId, requestingPlayerId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room)
            return undefined;
        const requestingPlayer = room.players.find((p) => p.id === requestingPlayerId && p.status === 'connected');
        if (!requestingPlayer)
            return undefined;
        if (room.roundTimerInterval) {
            clearInterval(room.roundTimerInterval);
            room.roundTimerInterval = null;
        }
        room.players.forEach((p) => room.scores[p.id] = 0);
        room.round = 0;
        room.winnerId = null;
        room.state = 'playing';
        room.totalFlagsRecognized = 0;
        room.currentFlag = null;
        room.playersAnsweredThisRound.clear();
        room.correctAnswerGivenThisRound = false;
        room.lastCorrectAnswererId = null;
        room.currentRoundTimeLeft = ROUND_DURATION_SECONDS;
        room.usedCountryIds.clear();
        room.expectedAnswer = null;
        this.startRound(roomId);
        this.io.to(roomId).emit('game:restart', this.roomToRoomToSend(room));
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        return room;
    }
    notifyPlayerDisconnect(socketId, roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room)
            return;
        const playerToDisconnect = room.players.find((p) => p.id === socketId);
        if (!playerToDisconnect)
            return;
        playerToDisconnect.status = 'disconnected_temp';
        const disconnectTimer = setTimeout(() => {
            if (room.playerDisconnectTimers.has(playerToDisconnect.id)) {
                playerToDisconnect.status = 'disconnected';
                room.playerDisconnectTimers.delete(playerToDisconnect.id);
                this.checkGameEndCondition(roomId);
                this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
                this.io.to(roomId).emit('game:update', this.roomToRoomToSend(room));
            }
        }, 10000);
        room.playerDisconnectTimers.set(playerToDisconnect.id, disconnectTimer);
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        this.io.to(roomId).emit('game:update', this.roomToRoomToSend(room));
    }
    checkGameEndCondition(roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room || room.state === 'gameOver')
            return;
        const connectedPlayers = room.players.filter((p) => p.status === 'connected');
        const activePlayers = room.players.filter((p) => p.status === 'connected' || p.status === 'disconnected_temp');
        if (room.kooonTreezNbPlayer !== 'solo') {
            if (connectedPlayers.length <= 1 && activePlayers.length <= 1) {
                if (connectedPlayers.length === 1)
                    this.endGame(roomId, connectedPlayers[0].id, 'last_player_standing');
                else if (activePlayers.length === 0)
                    this.endGame(roomId, null, 'interrupted');
            }
        }
        else if (room.kooonTreezNbPlayer === 'solo' && connectedPlayers.length === 0) {
            this.endGame(roomId, null, 'interrupted');
        }
    }
    deleteRoom(roomId) {
        const room = koOonTreeZRooms.get(roomId);
        if (room) {
            if (room.roundTimerInterval) {
                clearInterval(room.roundTimerInterval);
                room.roundTimerInterval = null;
            }
            room.playerDisconnectTimers.forEach((timer) => clearTimeout(timer));
            room.playerDisconnectTimers.clear();
            koOonTreeZRooms.delete(roomId);
            this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        }
    }
    getRoom(roomId) {
        return koOonTreeZRooms.get(roomId);
    }
    getAllRooms() {
        return Array.from(koOonTreeZRooms.values());
    }
    roomToRoomToSend = (room) => {
        return {
            id: room.id,
            name: room.name,
            gameType: room.gameType,
            scores: room.scores || {},
            players: room.players.map((p) => ({
                id: p.id,
                username: p.username,
                score: p.score,
                roomId: p.roomId,
                status: p.status,
            })),
            state: room.state,
            winnerId: room.winnerId,
            round: room.round,
            maxPlayers: room.maxPlayers,
            kooonTreezNbPlayer: room.kooonTreezNbPlayer,
            kooonTreezMode: room.kooonTreezMode,
            kooonTreezOption: room.kooonTreezOption,
            kooonTreezLevel: room.kooonTreezLevel,
            kooonTreezSoloMode: room.kooonTreezSoloMode,
            currentRoundTimeLeft: room.currentRoundTimeLeft,
            totalFlagsRecognized: room.totalFlagsRecognized,
            targetFlagsCount: room.targetFlagsCount,
            currentFlag: room.currentFlag,
        };
    };
    handleSubmitAnswer(roomId, playerId, answer) {
        const room = koOonTreeZRooms.get(roomId);
        if (!room || room.state !== 'playing' || room.currentFlag === null || room.expectedAnswer === null) {
            this.io.to(playerId).emit('error:message', 'La partie n\'est pas active, le salon n\'existe pas ou aucune question n\'est en cours.');
            return;
        }
        const player = room.players.find((p) => p.id === playerId);
        if (!player)
            return;
        if (room.playersAnsweredThisRound.has(playerId))
            return;
        room.playersAnsweredThisRound.add(playerId);
        const isCorrect = answer.toLowerCase().trim() === room.expectedAnswer.toLowerCase().trim();
        let pointsEarned = 0;
        if (isCorrect) {
            if (!room.correctAnswerGivenThisRound) {
                pointsEarned = 8;
                room.correctAnswerGivenThisRound = true;
                room.lastCorrectAnswererId = playerId;
                room.totalFlagsRecognized++;
                this.io.to(room.id).emit('kooontreez:feedback', { playerId, isCorrect, points: pointsEarned, message: `${player.username} a trouvé la bonne réponse ! (+${pointsEarned} points)` });
            }
            else {
                pointsEarned = 4;
                this.io.to(room.id).emit('kooontreez:feedback', { playerId, isCorrect, points: pointsEarned, message: `${player.username} a aussi trouvé la bonne réponse ! (+${pointsEarned} points)` });
            }
        }
        else {
            pointsEarned = 0;
            this.io.to(room.id).emit('kooontreez:feedback', { playerId, isCorrect, points: pointsEarned, message: `${player.username} : Mauvaise réponse. La bonne réponse était "${room.expectedAnswer}".` });
        }
        room.scores[playerId] = (room.scores[playerId] || 0) + pointsEarned;
        player.score = room.scores[playerId];
        this.io.to(roomId).emit('game:update', this.roomToRoomToSend(room));
        this.io.emit('room:list', Array.from(koOonTreeZRooms.values()).map(this.roomToRoomToSend));
        const connectedPlayersCount = room.players.filter((p) => p.status === 'connected').length;
        if (connectedPlayersCount > 0 && room.playersAnsweredThisRound.size === connectedPlayersCount) {
            this.endRound(roomId);
        }
        else if (isCorrect && typeof room.targetFlagsCount === 'number' && room.totalFlagsRecognized >= room.targetFlagsCount) {
            this.endGame(roomId, this.getWinnerByScore(room), 'target_reached');
        }
    }
}
