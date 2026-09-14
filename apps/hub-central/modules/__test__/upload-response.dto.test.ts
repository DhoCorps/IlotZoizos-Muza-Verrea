import { describe, it, expect } from 'vitest';
import { UploadResponseSchema, UploadResponseDto } from '../storage/dto/upload-response.dto';

describe('UploadResponseDto & Schéma', () => {
  it('devrait valider avec succès un objet de réponse d’upload conforme', () => {
    const validResponse: UploadResponseDto = {
      success: true,
      message: 'Artefact versé avec succès dans le Nexus R2.',
      key: 'hub-central/fr/projects/ilot/book.epub',
      publicUrl: 'https://cdn.ilot.dev/book.epub',
      etag: '"123456789abcdef"'
    };

    const result = UploadResponseSchema.safeParse(validResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.key).toContain('book.epub');
    }
  });

  it('devrait valider un objet sans optionnel (etag)', () => {
    const minimalResponse = {
      success: true,
      message: 'Upload réussi.',
      key: 'test-key',
      publicUrl: 'https://cdn.ilot.dev/test.png'
    };

    const result = UploadResponseSchema.safeParse(minimalResponse);

    expect(result.success).toBe(true);
  });

  it('devrait rejeter un objet dont l’URL publique n’est pas valide', () => {
    const invalidResponse = {
      success: true,
      message: 'Upload réussi.',
      key: 'test-key',
      publicUrl: 'ce-n-est-pas-une-url'
    };

    const result = UploadResponseSchema.safeParse(invalidResponse);

    expect(result.success).toBe(false);
  });

  it('devrait rejeter un objet s’il manque la clé de stockage', () => {
    const incompleteResponse = {
      success: true,
      message: 'Upload réussi.',
      publicUrl: 'https://cdn.ilot.dev/test.png'
    };

    const result = UploadResponseSchema.safeParse(incompleteResponse);

    expect(result.success).toBe(false);
  });
});