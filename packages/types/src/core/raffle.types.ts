import { z } from 'zod';

// 🎫 MODULE LUCKY DROP : SCHÉMA DE LA LOTERIE
export const RaffleSchema = z.object({
  uid: z.string(),
  creatorUid: z.string(),
  prizeProductUid: z.string(),
  // Le prix est strictement en Éclats (Shards) pour respecter notre "Hack du Karma"
  ticketPriceShards: z.number().min(0, "Le prix du ticket en Éclats ne peut être négatif"),
  maxTickets: z.number().int().positive().optional(),
  drawDate: z.date(),
  status: z.enum(['OPEN', 'DRAWN', 'CANCELLED']).default('OPEN'),
  createdAt: z.date().optional(),
});
export type IRaffle = z.infer<typeof RaffleSchema>;

// 🎫 MODULE LUCKY DROP : SCHÉMA DU TICKET
export const RaffleTicketSchema = z.object({
  uid: z.string(),
  raffleUid: z.string(),
  buyerUid: z.string(),
  // Le numéro du ticket permet de garantir l'unicité et la transparence du tirage
  ticketNumber: z.number().int().positive(),
  purchasedAt: z.date().optional(),
});
export type IRaffleTicket = z.infer<typeof RaffleTicketSchema>;