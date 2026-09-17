import { describe, it, expect } from 'vitest';
import { UniversalMediaModel } from '../../nosql/universalMedia.model';

describe('UniversalMedia Model (Contrat Ultime)', () => {
  it('devrait valider un media complet avec les champs e-commerce, métadonnées studio et la provenance', () => {
    const validMedia = new UniversalMediaModel({
      mediaId: 'uuid-1234-5678',
      creatorUid: 'oiseau_666',
      creatorSlug: 'amiga-mia',
      sourceApp: 'DHO', // Le Bordel de DhÖ
      type: 'AUDIO_STEM',
      title: { fr: 'Forêt Brûlée - Lead Vocal', en: 'Burned Forest - Lead' },
      fileUrl: 'https://s3.ilot-zoizos.com/audio/foret-brulee.wav',
      mimeType: 'audio/wav',
      sizeBytes: 15420000,
      priceCents: 99, // Prêt pour la monétisation
      metadata: { 
        bpm: 120, 
        key: 'Cm',
        isStudioProject: true,
        permissions: { allowShowcase: true, allowRadio: true }
      },
      rights: {
        allow_radio: true,
        allow_commercial: false,
        consentForShowcase: true
      }
    });

    const error = validMedia.validateSync();
    expect(error).toBeUndefined();
  });

  it('devrait appliquer les valeurs par défaut (gratuité, source inconnue et droits restrictifs)', () => {
    const media = new UniversalMediaModel({
      creatorUid: 'oiseau_998',
      type: 'IMAGE',
      title: { fr: 'Artefact Inconnu' },
      fileUrl: 'https://s3.ilot-zoizos.com/img/artefact.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 204800,
    });

    // Vérification des valeurs par défaut pragmatiques
    expect(media.priceCents).toBe(0);
    expect(media.sourceApp).toBe('UNKNOWN');
    expect(media.metadata).toBeDefined();
    
    // Vérification de la souveraineté fermée par défaut
    expect(media.rights.allow_radio).toBe(false);
    expect(media.rights.allow_lyrika).toBe(false);
    expect(media.rights.allow_remix).toBe(false);
    expect(media.rights.consentForMusicSync).toBe(false);
  });

  it('devrait rejeter un media sans la langue racine (fr)', () => {
    const invalidMedia = new UniversalMediaModel({
      creatorUid: 'oiseau_123',
      type: 'TEXT',
      title: { en: 'Only English Title' }, // Erreur ici : le fr est vital
      fileUrl: 'https://s3.ilot-zoizos.com/docs/file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });

    const error = invalidMedia.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['title.fr']).toBeDefined();
  });

  it('devrait rejeter une sourceApp ou un type de media non reconnu', () => {
    const invalidMedia = new UniversalMediaModel({
      creatorUid: 'oiseau_123',
      sourceApp: 'EXTERIEUR', // Invalide selon notre Enum
      type: 'HOLOGRAMME', // Invalide
      title: { fr: 'Test Matrice' },
      fileUrl: 'https://s3.ilot-zoizos.com/test',
      mimeType: 'unknown',
      sizeBytes: 10,
    });

    const error = invalidMedia.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors['sourceApp']).toBeDefined();
    expect(error?.errors['type']).toBeDefined();
  });
});