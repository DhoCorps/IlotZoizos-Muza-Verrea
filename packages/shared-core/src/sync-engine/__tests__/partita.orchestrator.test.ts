// Fichier : packages/shared-core/src/sync-engine/__tests__/partita.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaOrchestrator } from '../partita.orchestrator';
import { PartitaModel, UniversalCommentModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

const mockFindOneAndUpdate = vi.fn();

// 🛡️ MOCK UNIFIÉ ET SÉCURISÉ DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PartitaModel: {
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
      deleteOne: vi.fn(),
    },
    UniversalCommentModel: {
      deleteMany: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

// 🚀 MOCK ROBUSTE DU COPYRIGHT ENGINE (Préservation de la Filiation)
vi.mock('../utils/copyright.engine', () => ({
  sanitizeCopyright: vi.fn((meta) => {
    if (meta && meta.filiation) return { ...meta, filiation: meta.filiation };
    if (!meta) return { role: 'CREATOR', isExclusiveIlot: false };
    if (meta.role === 'CURATOR') return { ...meta, isExclusiveIlot: false };
    return meta;
  }),
  getCopyrightCypherRelation: vi.fn((role) => {
    if (role === 'SUBLIMATOR') return 'SUBLIMATES';
    if (role === 'CURATOR') return 'CURATES';
    return 'CREATED';
  })
}));

describe('PartitaOrchestrator - Sédimentation Musicale, SEO & Sceau', () => {
  let orchestrator: PartitaOrchestrator;
  const userSignature = { actorUid: 'oiseau-A', capabilities: [] };
  const strangerSignature = { actorUid: 'oiseau-B', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PartitaOrchestrator();
  });

  describe('fosterPartita (Création)', () => {
    it('🔴 devrait rejeter la création si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-A' };
      await expect(orchestrator.fosterPartita(data, strangerSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🟢 devrait fonder une partition, générer le Sceau Cryptographique, et l\'insérer dans Mongo et Neo4j', async () => {
      const data = { 
        title: 'Ma Superbe Basse', 
        authorUid: 'oiseau-A', 
        instrument: 'BASS', 
        content: 'E G B C D',
        copyrightMetadata: {
          role: 'SUBLIMATOR',
          isExclusiveIlot: true,
          filiation: {
            isExternalSource: true,
            sourceAuthorName: 'Auteur Original',
            sourceWorkTitle: 'Monolithe Source'
          }
        }
      };
      
      // 🛠️ Support du chaînage .session(...).lean() pour les tests d'unicité
      vi.mocked(PartitaModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as any);

      let capturedMongoData: any;
      vi.mocked(PartitaModel.create).mockImplementation((docs: any) => {
        capturedMongoData = docs[0];
        return [{
          uid: 'partita-123', 
          title: 'Ma Superbe Basse', 
          slug: 'ma-superbe-basse',
          toObject: function() { return this; }
        }] as any;
      });

      const result = await orchestrator.fosterPartita(data as any, userSignature as any);
      
      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('partita-123');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Vérification de la création du Sceau Cryptographique avec le Hash et la Filiation
      expect(capturedMongoData.cryptoSeal).toBeDefined();
      expect(capturedMongoData.cryptoSeal.digitalSignature).toBeDefined();
      expect(capturedMongoData.cryptoSeal.copyrightMetadata.role).toBe('SUBLIMATOR');
      expect(capturedMongoData.cryptoSeal.copyrightMetadata.filiation.sourceWorkTitle).toBe('Monolithe Source');
    });
  });

  describe('disintegratePartita (Suppression)', () => {
    it('🟢 devrait retourner les URLs des fichiers à purger au Hub-Central et déclencher la purge en cascade des Commentaires', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ 
        uid: 'partita-123', 
        authorUid: 'oiseau-A',
        media: {
          coverImageUrl: 'https://cdn.ilot.com/cover.png',
          audioTrackUrl: 'https://cdn.ilot.com/track.mp3'
        }
      } as any);

      const result = await orchestrator.disintegratePartita('partita-123', userSignature as any);
      
      expect(result.success).toBe(true);
      expect(result.filesToDelete).toHaveLength(2);
      expect(result.filesToDelete).toContain('https://cdn.ilot.com/track.mp3');
      
      // Vérification des suppressions MongoDB
      expect(PartitaModel.deleteOne).toHaveBeenCalled();
      expect(UniversalCommentModel.deleteMany).toHaveBeenCalledWith(
        { targetUid: 'partita-123' },
        expect.anything() // Vérification de la transmission de session
      );
    });
  });
});