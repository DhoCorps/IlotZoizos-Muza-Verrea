import { describe, it, expect } from 'vitest';
import { RaffleSchema, RaffleTicketSchema } from '../core/raffle.types';

describe('Raffle Types - Validation Zod (Module Lucky Drop)', () => {
  it('🟢 doit valider une loterie (Raffle) valide sans limite de tickets', () => {
    const raffle = {
      uid: 'raffle_123',
      creatorUid: 'bird_artisan',
      prizeProductUid: 'prod_legendary',
      ticketPriceShards: 50, // 50 Éclats la participation
      drawDate: new Date('2026-12-31T23:59:59Z'),
      status: 'OPEN'
    };
    expect(RaffleSchema.safeParse(raffle).success).toBe(true);
  });

  it('🟢 doit valider une loterie avec un nombre maximum de tickets', () => {
    const raffle = {
      uid: 'raffle_456',
      creatorUid: 'bird_artisan',
      prizeProductUid: 'prod_rare',
      ticketPriceShards: 10,
      maxTickets: 100, // Limité à 100 participants
      drawDate: new Date('2026-11-15T20:00:00Z'),
      status: 'OPEN'
    };
    expect(RaffleSchema.safeParse(raffle).success).toBe(true);
  });

  it('🔴 doit rejeter une loterie avec un prix de ticket négatif', () => {
    const invalidRaffle = {
      uid: 'raffle_error',
      creatorUid: 'bird_hacker',
      prizeProductUid: 'prod_bug',
      ticketPriceShards: -5, // Invalide
      drawDate: new Date(),
    };
    const result = RaffleSchema.safeParse(invalidRaffle);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Le prix du ticket en Éclats ne peut être négatif");
    }
  });

  it('🟢 doit valider un ticket de loterie (RaffleTicket) valide', () => {
    const ticket = {
      uid: 'ticket_001',
      raffleUid: 'raffle_123',
      buyerUid: 'bird_buyer',
      ticketNumber: 42,
      purchasedAt: new Date()
    };
    expect(RaffleTicketSchema.safeParse(ticket).success).toBe(true);
  });

  it('🔴 doit rejeter un ticket avec un numéro invalide (négatif ou nul)', () => {
    const invalidTicket = {
      uid: 'ticket_error',
      raffleUid: 'raffle_123',
      buyerUid: 'bird_buyer',
      ticketNumber: 0, // Le numéro de ticket doit être positif
    };
    expect(RaffleTicketSchema.safeParse(invalidTicket).success).toBe(false);
  });
});