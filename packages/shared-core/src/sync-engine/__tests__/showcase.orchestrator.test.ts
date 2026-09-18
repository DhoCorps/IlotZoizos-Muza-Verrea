import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShowcaseOrchestrator } from '../showcase.orchestrator';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { UserShowcaseShuffler } from '../../utils/userShowcaseShuffler';
import { IlotError } from '../../errors/ilot.errors';
import * as orchestratorEngine from '../../utils/orchestrator.engine';

// 🛡️ 1. Mock synchrone de la Silice
vi.mock('@ilot/infrastructure', () => ({
  UniversalMediaModel: {
    find: vi.fn(),
  },
  OiseauModel: {},
  findEntityBySlugOrUid: vi.fn(),
}));

// 🛡️ 2. Mock direct du moteur d'orchestration pour neutraliser les appels Mongoose internes
vi.mock('../../utils/orchestrator.engine', () => ({
  resolveCanonicalUid: vi.fn(),
}));

describe('ShowcaseOrchestrator - Séquençage et Association Multimédia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🛡️ Bypass de la logique interne du Shuffler
    vi.spyOn(UserShowcaseShuffler, 'shuffleForUser').mockImplementation((items) => [...items]);

    // 🔍 Résolution canonique via mock (contourne totalement findEntityBySlugOrUid)
    vi.mocked(orchestratorEngine.resolveCanonicalUid).mockImplementation(async (_model, identifier) => {
      if (identifier === 'bird_ghost') {
        throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
      }
      return 'bird_canonical_observer'; // Succès par défaut
    });
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
    await expect(
      ShowcaseOrchestrator.getPersonalizedShowcase('bird_ghost', { selectedApps: [] })
    ).rejects.toThrow(/Oiseau introuvable/);
  });

  it('🟢 doit ordonner la playlist et habiller les œuvres visuelles avec une piste d\'ambiance sonore', async () => {
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
    
    // Validation que l'utilitaire d'orchestration a bien été appelé
    expect(orchestratorEngine.resolveCanonicalUid).toHaveBeenCalledTimes(1);
  });
});