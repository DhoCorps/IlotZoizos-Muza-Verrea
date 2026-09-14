import { describe, it, expect } from 'vitest';
import { storageService } from '@/modules/storage/storage.service'; // Ajuste le chemin selon ton arborescence

describe('StorageService (La Forge S3 Unifiée)', () => {

  describe('Génération de clés S3', () => {
    it('devrait générer un chemin structuré en mode LEGACY', () => {
      const key = storageService.generateKey({
        mode: 'LEGACY',
        inceptId: 'ilot-zoizos',
        locale: 'fr',
        entityType: 'teams',
        entityId: 'team_uuid_123',
        imageType: 'cover',
        filename: 'mon Fichier(1).jpg'
      });
      
      // inceptions/ilot-zoizos/fr/teams/team_uuid_123/cover_163..._mon_fichier_1_.jpg
      expect(key).toMatch(/^inceptions\/ilot-zoizos\/fr\/teams\/team_uuid_123\/cover_\d+_mon_fichier_1_.jpg$/);
    });

    it('devrait générer un chemin universel en mode UNIVERSAL', () => {
      const key = storageService.generateKey({
        mode: 'UNIVERSAL',
        sourceApp: 'DHO',
        mediaType: 'AUDIO_STEM',
        creatorUid: 'oiseau_666',
        filename: 'Voix Lead Finale.wav'
      });
      
      // media/DHO/AUDIO_STEM/oiseau_666/163..._voix_lead_finale.wav
      expect(key).toMatch(/^media\/DHO\/AUDIO_STEM\/oiseau_666\/\d+_voix_lead_finale.wav$/);
    });
  });

  describe('Mécaniques de base', () => {
    it('devrait extraire correctement la clé depuis une URL publique', () => {
      const mockUrl = 'http://cloud.com/media/PARTITA/IMAGE/oiseau_1/123_test.jpg';
      const key = storageService.extractKeyFromUrl(mockUrl);
      
      expect(key).toBe('media/PARTITA/IMAGE/oiseau_1/123_test.jpg');
    });

    it('devrait rejeter un upload sans fichier', async () => {
      await expect(storageService.uploadFile(null, 'test-key'))
        .rejects
        .toThrow('Maladresse technique : La brindille est manquante.');
    });

    it('devrait rejeter un upload avec un fichier trop lourd (> 50Mo)', async () => {
      const giantFile = { name: 'fat.wav', size: 60 * 1024 * 1024 }; // 60 Mo
      
      await expect(storageService.uploadFile(giantFile, 'test-key'))
        .rejects
        .toThrow('Ineptie de volume : La brindille dépasse la limite de 50Mo.');
    });
  });
});