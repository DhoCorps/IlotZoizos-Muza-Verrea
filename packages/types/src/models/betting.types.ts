import { GameMode, CurrencyEnum } from '../core/economy.types'; // ou le chemin relatif vers ton fichier de schémas
import { z } from 'zod';

export type WagerCurrency = z.infer<typeof CurrencyEnum>;
export type { GameMode };

export interface IGameRoomConfig {
  gameId: string;
  roomCode?: string;
  mode: GameMode;
  wagerAmount: number;
  wagerCurrency: WagerCurrency;
  creatorUid: string;
}

export interface IGameRoomState {
  roomId: string;
  config: IGameRoomConfig;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'ABORTED';
  participants: string[];
  createdAt: Date;
}

export interface IBettorResult {
  userId: string;
  gameId: string;
  betAssets: Array<{ type: string; amount: number; entityId?: string }>;
  winnings: Array<{ type: string; amount: number }>;
  multiplier: number;
  status: 'PENDING' | 'WON' | 'LOST';
  timestamp: Date;
}