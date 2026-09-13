// packages/shared-core/src/sync-engine/__tests__/alchemyEngine.test.ts

import { describe, it, expect } from 'vitest';
import { AlchemyEngine } from '../alchimy.engine';

describe('AlchemyEngine - Alchimie Multimédia Automatique', () => {
  it('doit associer de manière rotative une piste musicale aux contenus textuels de l\'Agora', () => {
    const mockItems = [
      {
        uid: 'poet_1',
        sourceModule: 'POETRIK',
        title: 'Ode au Matin',
        metadata: {}
      },
      {
        uid: 'partita_1',
        sourceModule: 'PARTITA',
        title: 'Vibration de l\'Aube',
        mediaUrl: 'cdn://audio.mp3',
        consentForMusicSync: true,
        authorSlug: 'compositeur-1'
      }
    ];

    const infused = AlchemyEngine.infuseAmbientAudio(mockItems);

    expect(infused).toHaveLength(2);
    
    // Le poème textuel doit avoir reçu une piste d'ambiance sonore
    const poemeItem = infused.find(i => i.uid === 'poet_1');
    expect(poemeItem?.metadata?.ambientTrackInfo).toBeDefined();
    expect(poemeItem?.metadata?.ambientTrackInfo.title).toBe('Vibration de l\'Aube');
    expect(poemeItem?.metadata?.ambientTrackInfo.mediaUrl).toBe('cdn://audio.mp3');

    // La partition musicale ne doit pas recevoir d'ambiance sur elle-même
    const partitaItem = infused.find(i => i.uid === 'partita_1');
    expect(partitaItem?.metadata?.ambientTrackInfo).toBeUndefined();
  });
});