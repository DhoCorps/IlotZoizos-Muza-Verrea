import { GameMode, CurrencyEnum } from '../core/economy.types';
import { z } from 'zod';

export type WagerCurrency = z.infer<typeof CurrencyEnum>;
export type { GameMode };

export interface IGameRoomConfig {
  gameId: string;
  roomCode?: string;
  mode: GameMode;
  wagerAmountCents: number; // 🚀 Harmonisé en centimes stricts
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
  betAssets: Array<{ type: string; amountCents?: number; amount?: number; entityId?: string }>; // Rétrocompatibilité souple mais orienté amountCents
  winnings: Array<{ type: string; amountCents: number }>; // 🚀 Harmonisation en centimes
  multiplier: number;
  status: 'PENDING' | 'WON' | 'LOST';
  timestamp: Date;
}