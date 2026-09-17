import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoetrikOrchestrator } from '../poetrik.orchestrator';
import { LexiconEntryModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    LexiconEntryModel: {
      create: vi.fn(),
      findOne: vi.fn(),
    },
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { 
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) 
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PoetrikOrchestrator - Moteur Lexical & Graphe de Rimes', () => {
  let orchestrator: PoetrikOrchestrator;
  const adminSignature = { actorUid: 'architect_root', capabilities: ['*'] };
  const strangerSignature = { actorUid: 'bird_intruder', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PoetrikOrchestrator();
  });

  describe('fosterLexiconEntry (Ingestion d\'un mot universel)', () => {
    it('doit rejeter (403) si l\'oiseau n\'a pas l\'Aura souveraine', async () => {
      const data = {
        uid: 'lex_fr_test',
        languageCode: 'fr',
        word: 'test',
        phoneticIpa: '/tɛst/',
        syllableCount: 1,
        definitions: { fr: 'Essai' },
        partOfSpeech: 'noun'
      };

      await expect(
        orchestrator.fosterLexiconEntry(data, strangerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('doit rejeter (400) si les informations de base du mot manquent', async () => {
      const invalidData = {
        uid: 'lex_fr_',
        languageCode: 'fr',
        word: '', // Mot manquant
        phoneticIpa: '',
        syllableCount: 1,
        definitions: {},
        partOfSpeech: 'noun'
      };

      await expect(
        orchestrator.fosterLexiconEntry(invalidData, adminSignature as any)
      ).rejects.toThrow(/Un mot nécessite au moins/);
    });

    it('doit fonder une entrée lexicale dans MongoDB et tisser les relations dans Neo4j', async () => {
      const data = {
        uid: 'lex_fr_oiseau',
        languageCode: 'fr',
        word: 'oiseau',
        phoneticIpa: '/wa.zo/',
        syllableCount: 2,
        definitions: { fr: 'Animal à plumes' },
        partOfSpeech: 'noun',
        rhymesWith: [
          { targetUid: 'lex_fr_roseau', type: 'rich', match: 'zo' }
        ],
        translations: [
          { targetUid: 'lex_en_bird', lang: 'en' }
        ]
      };

      vi.mocked(LexiconEntryModel.create).mockResolvedValueOnce([
        { uid: 'lex_fr_oiseau', word: 'oiseau', languageCode: 'fr' }
      ] as any);

      const result = await orchestrator.fosterLexiconEntry(data, adminSignature as any);

      expect(result.success).toBe(true);
      expect((result.mongo as any).uid).toBe('lex_fr_oiseau');
      expect(LexiconEntryModel.create).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});