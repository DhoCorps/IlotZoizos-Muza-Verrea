// packages/shared-core/src/sync-engine/__tests__/showcase.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShowcaseOrchestrator } from '../showcase.orchestrator';
import { UniversalMediaModel } from '../../../../infrastructure/src/database/models/nosql/universalMedia.model';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { UserShowcaseShuffler } from '../../utils/userShowcaseShuffler';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mocks de la Silice
vi.mock('../../../../infrastructure/src/database/models/nosql/universalMedia.model', () => ({
  UniversalMediaModel: {
    find: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

describe('ShowcaseOrchestrator - Séquençage et Association Multimédia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🛡️ Utilisation de spyOn au lieu de vi.mock pour éviter tout problème de résolution de chemin.
    // On bypass la logique interne du Shuffler pour se concentrer sur le test de l'Orchestrateur.
    vi.spyOn(UserShowcaseShuffler, 'shuffleForUser').mockImplementation((items) => [...items]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('🔴 doit rejeter l\'appel (403) si le userUid n\'est pas fourni', async () => {
    await expect(
      ShowcaseOrchestrator.getPersonalizedShowcase('', { selectedApps: [] })
    ).rejects.toThrow(IlotError);
  });

  it('🔴 doit rejeter l\'appel (404) si l\'Oiseau est un fantôme (non résolu dans la Silice)', async () => {
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(null),
    } as any);

    await expect(
      ShowcaseOrchestrator.getPersonalizedShowcase('bird_ghost', { selectedApps: [] })
    ).rejects.toThrow(/Oiseau introuvable/);
  });

  it('🟢 doit ordonner la playlist et habiller les œuvres visuelles avec une piste d\'ambiance sonore', async () => {
    // 1. Simulation de la résolution canonique de l'Oiseau
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_observer' }),
    } as any);

    const mockDbItems = [
      {
        mediaId: 'img_1', sourceApp: 'ABYSS', ownerUid: 'bird_visual', ownerSlug: 'artiste-visuel', title: 'Toile du Néant',
        mediaUrl: 'url_img', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date()
      },
      {
        mediaId: 'txt_1', sourceApp: 'DHO', ownerUid: 'bird_writer', ownerSlug: 'poete', title: 'Poème Silicium',
        mediaUrl: 'url_txt', consentForShowcase: true, consentForMusicSync: false, createdAt: new Date()
      },
      {
        mediaId: 'audio_1', sourceApp: 'PARTITA', ownerUid: 'bird_musician', ownerSlug: 'compositeur', title: 'Vibration Alpha',
        mediaUrl: 'url_audio', consentForShowcase: true, consentForMusicSync: true, createdAt: new Date()
      }
    ];

    // 2. Simulation de la projection Mongoose (.select().lean())
    vi.mocked(UniversalMediaModel.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValueOnce(mockDbItems),
    } as any);

    const playlist = await ShowcaseOrchestrator.getPersonalizedShowcase('bird_observer', { selectedApps: [] });

    expect(playlist).toHaveLength(3);
    
    // On isole les éléments qui ne sont pas des pistes Partita
    const visualItems = playlist.filter(item => item.sourceApp !== 'PARTITA');
    
    expect(visualItems).toHaveLength(2);

    // Vérification de l'association multimédia
    visualItems.forEach(item => {
      expect(item.metadata).toBeDefined();
      expect(item.metadata!.ambientTrackInfo).toBeDefined();
      expect(item.metadata!.ambientTrackInfo.title).toBe('Vibration Alpha');
      expect(item.metadata!.ambientTrackInfo.mediaUrl).toBe('url_audio');
    });

    const audioItem = playlist.find(item => item.sourceApp === 'PARTITA');
    expect(audioItem!.metadata?.ambientTrackInfo).toBeUndefined();
  });
});