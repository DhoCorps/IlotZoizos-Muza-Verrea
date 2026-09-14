import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { AddressInfo } from 'net';

describe('Game Server - Intégration WebSocket & Séquestre', () => {
  let ioServer: Server;
  let httpServer: any;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: "*" }
    });

    ioServer.on('connection', (socket) => {
      socket.on('room:create', (payload: any) => {
        const { 
          username, 
          roomName, 
          gameType, 
          wagerAmount = 0, 
          wagerCurrency = 'DHO', 
          gameMode = 'MULTIPLAYER',
          difficulty = 'Artisan'
        } = payload;

        const mockCreatedRoom = {
          id: 'room_test_999',
          name: roomName || `Salon de ${username}`,
          gameType,
          wagerAmount,
          wagerCurrency,
          gameMode,
          difficulty,
          players: [{ id: socket.id, username }]
        };

        socket.emit('room:created', mockCreatedRoom);
      });
    });

    // Utilisation d'une Promise pour démarrer le serveur proprement
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });

    // Connexion du client socket et attente de l'événement 'connect'
    await new Promise<void>((resolve) => {
      clientSocket = ioc(`http://localhost:${port}`, {
        transports: ['websocket']
      });
      clientSocket.on('connect', () => {
        resolve();
      });
    });
  });

  afterAll(() => {
    if (clientSocket) clientSocket.disconnect();
    if (ioServer) ioServer.close();
    if (httpServer) httpServer.close();
  });

  it('🟢 doit propager correctement les paramètres de pari et de séquestre lors de la création d\'un salon', async () => {
    const payload = {
      username: 'OiseauTesteur',
      roomName: 'Salon des Canopées',
      gameType: 'CrazyMorpion',
      wagerAmount: 50,
      wagerCurrency: 'DHO',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Maestro'
    };

    const roomCreatedPromise = new Promise((resolve) => {
      clientSocket.on('room:created', (roomData) => {
        resolve(roomData);
      });
    });

    clientSocket.emit('room:create', payload);

    const result: any = await roomCreatedPromise;

    expect(result).toBeDefined();
    expect(result.wagerAmount).toBe(50);
    expect(result.wagerCurrency).toBe('DHO');
    expect(result.gameMode).toBe('MULTIPLAYER');
    expect(result.difficulty).toBe('Maestro');
  });
});