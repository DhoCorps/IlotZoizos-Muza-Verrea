import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RaffleOrchestrator } from '../raffle.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { RaffleModel, TicketModel, ProductModel } from '@ilot/infrastructure';

// 1. Mock de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    RaffleModel: {},
    TicketModel: {},
    ProductModel: {}
  };
});

// 2. Mock du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ 
          records: [{ get: (field: string) => field === 'balance' ? 100 : 'mock' }] 
        })
      };
      return await cb(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('RaffleOrchestrator - Module Lucky Drop', () => {
  let orchestrator: RaffleOrchestrator;
  const mockActorUid = 'bird-creator';
  const mockBuyerUid = 'bird-buyer';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new RaffleOrchestrator();

    // 🛡️ LE BOUCLIER ULTIME POUR MONGOOSE
    const mockNullQuery = Promise.resolve(null) as any;
    mockNullQuery.session = vi.fn().mockResolvedValue(null);

    RaffleModel.findOne = vi.fn().mockReturnValue(mockNullQuery) as any;
    
    RaffleModel.insertMany = vi.fn().mockResolvedValue([{ uid: 'raffle_123' }]) as any;
    RaffleModel.updateOne = vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue(true) }) as any;
    
    TicketModel.countDocuments = vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue(5) }) as any;
    TicketModel.insertMany = vi.fn().mockResolvedValue([{ uid: 'ticket_006' }]) as any;
    TicketModel.find = vi.fn().mockReturnValue({ 
      session: vi.fn().mockResolvedValue([
        { uid: 'ticket_001', buyerUid: 'bird_loser' },
        { uid: 'ticket_002', buyerUid: 'bird_winner' } // Le gagnant simulé
      ]) 
    }) as any;

    ProductModel.updateOne = vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue(true) }) as any;
  });

  describe('createRaffle', () => {
    it('🟢 doit créer une loterie si le vendeur n\'en a pas déjà une', async () => {
      const result = await orchestrator.createRaffle(
        { uid: 'raffle_123', prizeProductUid: 'prod_1', ticketPriceShards: 10, drawDate: new Date() },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      
      expect(result.success).toBe(true);
      expect(result.raffleUid).toBe('raffle_123');
    });

    it('🔴 doit rejeter (403) si le vendeur a déjà une loterie OPEN', async () => {
      // On simule une loterie existante (valeur truthy)
      RaffleModel.findOne = vi.fn().mockResolvedValue({ uid: 'existing_raffle' }) as any;

      await expect(
        orchestrator.createRaffle(
          { uid: 'raffle_124', prizeProductUid: 'prod_2', ticketPriceShards: 10, drawDate: new Date() },
          { actorUid: mockActorUid, capabilities: ['*'] }
        )
      ).rejects.toThrow(/déjà une loterie en cours/);
    });
  });

  describe('buyTicket', () => {
    it('🟢 doit vérifier les fonds, débiter les Éclats et générer un ticket', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      // On recrée la promesse mockée spécifiquement pour renvoyer une loterie avec .session()
      const mockSessionQuery = Promise.resolve(null) as any;
      mockSessionQuery.session = vi.fn().mockResolvedValue({ 
        uid: 'raffle_123', status: 'OPEN', drawDate: futureDate, ticketPriceShards: 10 
      });

      RaffleModel.findOne = vi.fn().mockReturnValue(mockSessionQuery) as any;

      const result = await orchestrator.buyTicket('raffle_123', { actorUid: mockBuyerUid, capabilities: ['*'] });
      
      expect(result.success).toBe(true);
      expect(result.ticketUid).toBe('ticket_006');
    });
  });

  describe('executeDraw', () => {
    it('🟢 doit tirer un gagnant au sort et transférer la propriété de l\'artefact', async () => {
      const mockSessionQuery = Promise.resolve(null) as any;
      mockSessionQuery.session = vi.fn().mockResolvedValue({ 
        uid: 'raffle_123', status: 'OPEN', prizeProductUid: 'prod_1' 
      });

      RaffleModel.findOne = vi.fn().mockReturnValue(mockSessionQuery) as any;

      const result = await orchestrator.executeDraw('raffle_123');
      
      expect(result.success).toBe(true);
      expect(result.winnerUid).toBeDefined();
      expect(ProductModel.updateOne).toHaveBeenCalled(); // Vérifie le transfert
    });

    it('🟡 doit annuler la loterie si aucun ticket n\'a été vendu', async () => {
      const mockSessionQuery = Promise.resolve(null) as any;
      mockSessionQuery.session = vi.fn().mockResolvedValue({ uid: 'raffle_123', status: 'OPEN' });
      
      RaffleModel.findOne = vi.fn().mockReturnValue(mockSessionQuery) as any;
      
      // On simule 0 tickets
      TicketModel.find = vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue([]) }) as any;

      const result = await orchestrator.executeDraw('raffle_123');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Annulée');
    });
  });
});