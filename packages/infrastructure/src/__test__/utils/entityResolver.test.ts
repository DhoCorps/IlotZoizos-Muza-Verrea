import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findEntityBySlugOrUid } from '../../database/utils/entityResolver';

describe('EntityResolver - Résolution unifiée Slug / UID', () => {
  const mockFindOne = vi.fn();
  const mockLean = vi.fn();
  const mockExec = vi.fn();

  // Mock d'un modèle Mongoose générique
  const mockModel = {
    findOne: mockFindOne,
  } as unknown as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({
      lean: mockLean,
      exec: mockExec,
    });
  });

  it('doit rechercher par uid ou par slug en mode lean par défaut', async () => {
    const mockEntity = { uid: 'proj-123', slug: 'mon-chantier', name: 'Chantier Test' };
    mockLean.mockResolvedValueOnce(mockEntity);

    const result = await findEntityBySlugOrUid(mockModel, 'mon-chantier');

    expect(mockFindOne).toHaveBeenCalledWith({
      $or: [
        { uid: 'mon-chantier' },
        { slug: 'mon-chantier' }
      ]
    });
    expect(mockLean).toHaveBeenCalled();
    expect(result).toEqual(mockEntity);
  });

  it('doit retourner null si l’identifiant est vide ou invalide', async () => {
    const resultEmpty = await findEntityBySlugOrUid(mockModel, '');
    const resultSpaces = await findEntityBySlugOrUid(mockModel, '   ');

    expect(resultEmpty).toBeNull();
    expect(resultSpaces).toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('doit exécuter findOne sans lean si l’option lean est à false', async () => {
    const mockEntity = { uid: 'proj-123', slug: 'mon-chantier' };
    mockExec.mockResolvedValueOnce(mockEntity);

    const result = await findEntityBySlugOrUid(mockModel, 'proj-123', { lean: false });

    expect(mockExec).toHaveBeenCalled();
    expect(result).toEqual(mockEntity);
  });

  it('doit capturer les erreurs de base de données et retourner null en cas de panne', async () => {
    mockLean.mockRejectedValueOnce(new Error('Erreur MongoDB'));

    const result = await findEntityBySlugOrUid(mockModel, 'mon-chantier');

    expect(result).toBeNull();
  });
});