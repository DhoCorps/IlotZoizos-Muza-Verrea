import { describe, it, expect, beforeEach } from 'vitest';
import { AttachmentRegistry } from './shared.types';
import { IlotError } from '../errors/ilot.errors';
import { IUniversalAttachment } from '../../../types/src/models/message.types';

describe('AttachmentRegistry (Résolution Universelle des Entités de l\'Îlot)', () => {
  let registry: AttachmentRegistry;

  beforeEach(() => {
    registry = new AttachmentRegistry();
  });

  it('🟢 doit enregistrer un résolveur et résoudre une pièce jointe avec succès (ex: BLOG ou POETRY)', async () => {
    const mockAttachment: IUniversalAttachment = {
      id: 'blog-jamaica-123',
      title: 'Monologue sur la Jamaïque',
      type: 'BLOG',
      url: '/abyss-blog/jamaica'
    } as any;

    registry.register('BLOG', async (entityUid) => {
      if (entityUid === 'blog-jamaica-123') return mockAttachment;
      return null;
    });

    const result = await registry.resolve('BLOG', 'blog-jamaica-123');
    expect(result).toEqual(mockAttachment);
    expect(result.title).toBe('Monologue sur la Jamaïque');
  });

  it('🔴 doit lever une IlotError si aucun résolveur n\'est enregistré pour la source', async () => {
    await expect(registry.resolve('POETRY' as any, 'poetry-999')).rejects.toThrow(IlotError);
    
    await expect(registry.resolve('POETRY' as any, 'poetry-999')).rejects.toThrowError(
      /Aucun résolveur enregistré/
    );
  });

  it('🔴 doit lever une IlotError si le résolveur ne trouve pas l\'entité ciblée', async () => {
    registry.register('SONG', async () => null);

    await expect(registry.resolve('SONG' as any, 'song-unknown')).rejects.toThrow(IlotError);

    await expect(registry.resolve('SONG' as any, 'song-unknown')).rejects.toThrowError(
      /est introuvable/
    );
  });
});