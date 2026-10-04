// packages/shared-core/src/sync-engine/__tests__/poetrik.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoetrikOrchestrator } from '../poetrik.orchestrator';
import { LexiconEntryModel, PoemModel, LedgerEntryModel, PoetrikGraph } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX (Isolation Totale)
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
  LexiconEntryModel: { create: vi.fn() },
  PoemModel: { create: vi.fn() },
  LedgerEntryModel: { create: vi.fn() }, // 👈 Correction vitale ici
  PoetrikGraph: {
    upsertWordNode: vi.fn(),
    linkWordsRhyme: vi.fn(),
    upsertPoemNode: vi.fn(),
    linkAuthorToPoem: vi.fn(),
    linkPoemInspiration: vi.fn(),
  }
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn() };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PoetrikOrchestrator - Moteur Lexical & Sceau Poétique', () => {
  let orchestrator: PoetrikOrchestrator;
  const adminSignature = { actorUid: 'architect_root', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_poet_123', capabilities: ['member:write'] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PoetrikOrchestrator();
  });

  describe('fosterLexiconEntry (Ingestion d\'un mot universel)', () => {
    it('🔴 doit rejeter (403) si l\'oiseau n\'a pas l\'Aura souveraine', async () => {
      const data = { languageCode: 'fr', word: 'test', phoneticIpa: '/tɛst/', syllableCount: 1, definitions: {}, partOfSpeech: 'noun' };
      const strangerSignature = { actorUid: 'bird_intruder', capabilities: [] };

      await expect(orchestrator.fosterLexiconEntry(data, strangerSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🟢 doit fonder une entrée lexicale dans MongoDB et tisser les relations dans Neo4j', async () => {
      const data = {
        uid: 'lex_fr_oiseau',
        languageCode: 'fr',
        word: 'oiseau',
        phoneticIpa: '/wa.zo/',
        syllableCount: 2,
        definitions: { fr: 'Animal à plumes' },
        partOfSpeech: 'noun',
        rhymesWith: [ { targetUid: 'lex_fr_roseau', type: 'rich', match: 'zo' } ]
      };

      vi.mocked(LexiconEntryModel.create).mockResolvedValueOnce([{ uid: 'lex_fr_oiseau' }] as any);

      const result = await orchestrator.fosterLexiconEntry(data, adminSignature as any);

      expect(result.success).toBe(true);
      expect(LexiconEntryModel.create).toHaveBeenCalledTimes(1);
      expect(PoetrikGraph.upsertWordNode).toHaveBeenCalled();
      expect(PoetrikGraph.linkWordsRhyme).toHaveBeenCalledWith(expect.anything(), 'lex_fr_oiseau', 'lex_fr_roseau', 'rich', 'zo');
    });
  });

  describe('sealPoem (Sédimentation d\'un Poème)', () => {
    it('🔴 doit rejeter si le titre ou le contenu est manquant', async () => {
      await expect(orchestrator.sealPoem({ title: '', content: 'Vers...' }, userSignature as any))
        .rejects.toThrow(/Un poème nécessite un titre et des vers/);
    });

    it('🟢 doit sceller un poème complet, générer le SHA-256, et tisser les Muses (Neo4j)', async () => {
      const poemData = {
        title: 'Nuit sur l\'Îlot',
        content: 'Le ciel s\'embrase...',
        format: 'SONNET',
        inspiredByUid: 'poem_ancien_001',
        settings: { catharsisVeil: true }
      };

      vi.mocked(PoemModel.create).mockResolvedValueOnce([{ uid: 'poem_new' }] as any);

      const result = await orchestrator.sealPoem(poemData, userSignature as any);

      expect(result.success).toBe(true);
      expect(result.digitalSignature).toBeDefined(); 
      expect(result.digitalSignature).toHaveLength(64); 

      expect(PoemModel.create).toHaveBeenCalledTimes(1);
      expect(PoetrikGraph.upsertPoemNode).toHaveBeenCalled();
      expect(PoetrikGraph.linkAuthorToPoem).toHaveBeenCalledWith(expect.anything(), 'bird_poet_123', expect.any(String));
      expect(PoetrikGraph.linkPoemInspiration).toHaveBeenCalledWith(expect.anything(), expect.any(String), 'poem_ancien_001');
    });

    it('🟢 doit attribuer des Parchemins et préparer la mutation LyriKa si demandé', async () => {
      const poemData = {
        title: 'Chant de la Canopée',
        content: 'Rythmes et vents...',
        status: 'PUBLISHED' as const,
        transferToArena: true,
        audioAmbiance: { linkedEntityUid: 'sample_beat_1' }
      };

      vi.mocked(PoemModel.create).mockResolvedValueOnce([{ uid: 'poem_arena' }] as any);
      vi.mocked(LedgerEntryModel.create).mockResolvedValueOnce([{ entryUid: 'ldg_123' }] as any); // 👈 Correction vitale ici

      const result = await orchestrator.sealPoem(poemData, userSignature as any);

      expect(result.reward?.currency).toBe('PARCHEMIN');
      expect(result.reward?.amount).toBe(15);
      
      expect(LedgerEntryModel.create).toHaveBeenCalledTimes(1);
      const ledgerCallArgs = vi.mocked(LedgerEntryModel.create).mock.calls[0][0] as any;
      expect(ledgerCallArgs[0]).toHaveProperty('entryUid');
      expect(ledgerCallArgs[0]).toHaveProperty('ownerUid', 'bird_poet_123');
      expect(ledgerCallArgs[0]).toHaveProperty('amountCents', 1500); 
      expect(ledgerCallArgs[0]).toHaveProperty('entryHash');

      expect(result.mutations).toContain('LYRIKA_READY');
      expect(result.mutations).toContain('MUSIKA_READY');
    });
  });
});