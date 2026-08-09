// packages/shared-core/src/sync-engine/__tests__/showcase.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShowcaseOrchestrator } from '../showcase.orchestrator';
import { UniversalMediaModel } from '../../../../infrastructure/src/database/models/nosql/universalMedia.model';
import { IlotError } from '../../errors/ilot.errors';

// Mock de la Silice
vi.mock('../../../../infrastructure/src/database/models/nosql/universalMedia.model', () => ({
  UniversalMediaModel: {
    find: vi.fn(),
  },
}));

describe('ShowcaseOrchestrator - Séquençage et Association Multimédia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter l\'appel (403) si le userUid est fantôme', async () => {
    await expect(
      ShowcaseOrchestrator.getPersonalizedShowcase('', { selectedApps: [] })
    ).rejects.toThrow(IlotError);
  });

  it('doit ordonner la playlist et habiller les œuvres visuelles avec une piste d\'ambiance sonore', async () => {
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
        mediaUrl: 'url_audio', consentForShowcase: true, consentForMusicSync: true, createdAt: new Date() // consentForMusicSync = true !
      }
    ];

    vi.mocked(UniversalMediaModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(mockDbItems),
    } as any);

    const playlist = await ShowcaseOrchestrator.getPersonalizedShowcase('bird_observer', { selectedApps: [] });

    expect(playlist).toHaveLength(3);
    
    // On isole les éléments qui ne sont pas des pistes Partita
    const visualItems = playlist.filter(item => item.sourceApp !== 'PARTITA');
    
    expect(visualItems).toHaveLength(2);

    // Vérification de l'association multimédia : chaque item visuel doit avoir reçu Vibration Alpha en fond
    visualItems.forEach(item => {
      expect(item.metadata).toBeDefined();
      expect(item.metadata!.ambientTrackInfo).toBeDefined();
      expect(item.metadata!.ambientTrackInfo.title).toBe('Vibration Alpha');
      expect(item.metadata!.ambientTrackInfo.mediaUrl).toBe('url_audio');
    });

    // L'œuvre musicale originale ne doit pas avoir reçu d'ambiance par-dessus
    const audioItem = playlist.find(item => item.sourceApp === 'PARTITA');
    expect(audioItem!.metadata?.ambientTrackInfo).toBeUndefined();
  });
});