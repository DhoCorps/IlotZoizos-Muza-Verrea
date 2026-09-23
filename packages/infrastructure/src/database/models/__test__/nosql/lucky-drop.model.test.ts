import { describe, it, expect } from 'vitest';
import { RaffleModel } from '../../nosql/raffle.model';
import { TicketModel } from '../../nosql/ticket.model';

describe('Lucky Drop Models - Mongoose & Karma Engine', () => {
    
    // --- TESTS RAFFLE (LOTERIE) ---
    describe('Raffle Model', () => {
        it('🟢 doit valider une loterie conforme (immuabilité non testable via simple validation, mais la structure est validée)', () => {
            const drawDate = new Date();
            drawDate.setMonth(drawDate.getMonth() + 1);

            const validRaffle = {
                uid: 'raffle_777',
                creatorUid: 'bird_artisan',
                prizeProductUid: 'prod_legendary',
                ticketPriceShards: 50,
                maxTickets: 100,
                drawDate: drawDate,
                status: 'OPEN'
            };

            const raffle = new RaffleModel(validRaffle);
            expect(raffle.uid).toBe('raffle_777');
            expect(raffle.creatorUid).toBe('bird_artisan');
            expect(raffle.ticketPriceShards).toBe(50);
            expect(raffle.status).toBe('OPEN');
            expect(raffle.drawDate).toBe(drawDate);
        });

        it('🔴 doit rejeter une loterie sans date de tirage (drawDate manquant)', () => {
            const invalidData = {
                creatorUid: 'bird_1',
                prizeProductUid: 'prod_1',
                ticketPriceShards: 10
            };

            const error = new RaffleModel(invalidData).validateSync();
            expect(error?.errors?.drawDate).toBeDefined();
        });
    });

    // --- TESTS TICKET ---
    describe('Ticket Model', () => {
        it('🟢 doit valider un ticket conforme', () => {
            const validTicket = {
                uid: 'ticket_001',
                raffleUid: 'raffle_777',
                buyerUid: 'bird_lucky',
                ticketNumber: 42
            };

            const ticket = new TicketModel(validTicket);
            expect(ticket.uid).toBe('ticket_001');
            expect(ticket.raffleUid).toBe('raffle_777');
            expect(ticket.buyerUid).toBe('bird_lucky');
            expect(ticket.ticketNumber).toBe(42);
        });

        it('🔴 doit rejeter un ticket avec un numéro manquant ou invalide', () => {
            const invalidTicket = {
                raffleUid: 'raffle_777',
                buyerUid: 'bird_lucky'
                // ticketNumber manquant
            };

            const error = new TicketModel(invalidTicket).validateSync();
            expect(error?.errors?.ticketNumber).toBeDefined();
        });
    });
});