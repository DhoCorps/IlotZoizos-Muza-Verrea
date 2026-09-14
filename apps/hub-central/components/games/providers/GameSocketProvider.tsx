// apps/hub-central/components/games/providers/GameSocketProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface GameSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// 1. Création du Contexte
const GameSocketContext = createContext<GameSocketContextType>({
  socket: null,
  isConnected: false,
});

// 2. Hook personnalisé pour consommer le socket n'importe où
export const useGameSocket = () => useContext(GameSocketContext);

// 3. Le Provider qui va envelopper notre zone de jeu
export function GameSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // On initialise la connexion une seule fois globalement pour la zone des jeux
    if (!socketRef.current) {
      const SERVER_URL = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3002';
      socketRef.current = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true, // Auto-reconnexion en cas de micro-coupure
      });
    }

    const socket = socketRef.current;

    // Synchronisation immédiate de l'état si déjà connecté
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Nettoyage des écouteurs au démontage de l'effet, sans couper le socket (survie à la navigation)
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Déconnexion finale uniquement si le joueur quitte totalement la zone des jeux (démontage ultime du Provider)
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[Réseau] Déconnexion globale du joueur de la canopée des jeux.');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, []);

  return (
    <GameSocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </GameSocketContext.Provider>
  );
}