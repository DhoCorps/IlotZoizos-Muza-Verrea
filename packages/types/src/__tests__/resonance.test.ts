import { describe, it, expect } from 'vitest';
import { WeaveLinkSchema, EchoSchema } from '../models/resonance.types';

describe('ResonanceTypes - Validation des Schémas de Maillage et Échos', () => {
  it('doit valider un lien transdisciplinaire valide', () => {
    const validLink = {
      sourceUid: 'sujet-1',
      sourceLabel: 'Sujet',
      targetUid: 'proj-1',
      targetLabel: 'Project',
      relationType: 'ILLUMINATES'
    };
    const result = WeaveLinkSchema.safeParse(validLink);
    expect(result.success).toBe(true);
  });

  it('doit rejeter un label d\'entité inconnu ou mal typé', () => {
    const invalidLink = {
      sourceUid: 'sujet-1',
      sourceLabel: 'DomaineInconnu',
      targetUid: 'proj-1',
      targetLabel: 'Project',
      relationType: 'ILLUMINATES'
    };
    const result = WeaveLinkSchema.safeParse(invalidLink);
    expect(result.success).toBe(false);
  });

  it('doit valider un écho social valide (TEXT)', () => {
    const validEcho = {
      targetUid: 'sujet-1',
      targetLabel: 'Sujet',
      echoType: 'TEXT',
      content: 'Une résonance profonde avec le projet.'
    };
    const result = EchoSchema.safeParse(validEcho);
    expect(result.success).toBe(true);
  });

  it('doit rejeter un écho social dont le contenu est vide', () => {
    const emptyEcho = {
      targetUid: 'sujet-1',
      targetLabel: 'Sujet',
      echoType: 'TEXT',
      content: ''
    };
    const result = EchoSchema.safeParse(emptyEcho);
    expect(result.success).toBe(false);
  });
});