import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateOiseauIdentity } from '../identityGenerator.services';
import { LexiconEntryModel } from '../../models/nosql/lexiconEntry.model';

// Mock de Mongoose et du modèle LexiconEntry
vi.mock('../../models/nosql/lexiconEntry.model', () => ({
    LexiconEntryModel: {
        countDocuments: vi.fn(),
        findOne: vi.fn(),
    },
}));

// Mock de la connexion à la base
vi.mock('../../mongoose', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('IdentityGenerator Service (Univers\'Hall)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 doit générer une identité complète avec un pseudo poétique et une couleur HEX valide de la canopée', async () => {
        // Simulation des réponses de MongoDB pour chaque type de mot (Adjectif, Nom, Verbe)
        vi.mocked(LexiconEntryModel.countDocuments).mockResolvedValue(5);
        
        vi.mocked(LexiconEntryModel.findOne)
            .mockReturnValueOnce({ skip: vi.fn().mockResolvedValue({ word: 'sélénite' }) } as any) // Adjectif
            .mockReturnValueOnce({ skip: vi.fn().mockResolvedValue({ word: 'faucon' }) } as any)   // Nom
            .mockReturnValueOnce({ skip: vi.fn().mockResolvedValue({ word: 'chante' }) } as any);  // Verbe

        const identity = await generateOiseauIdentity();

        expect(identity).toHaveProperty('pseudo');
        expect(identity).toHaveProperty('frequenceHEX');
        expect(identity.pseudo).toBe('Sélénite Faucon Chante');
        
        // Vérifie que la couleur fait bien partie de notre palette écologique
        const validColors = ['#2D3748', '#E53E3E', '#4A5568', '#C53030', '#718096'];
        expect(validColors).toContain(identity.frequenceHEX);
    });

    it('🟢 doit utiliser les fallbacks de secours si la base Lexicon est vide (count = 0)', async () => {
        // Simulation d'une base vide
        vi.mocked(LexiconEntryModel.countDocuments).mockResolvedValue(0);

        const identity = await generateOiseauIdentity();

        expect(identity.pseudo).toBeDefined();
        expect(typeof identity.pseudo).toBe('string');
        expect(identity.pseudo.split(' ').length).toBe(3); // 3 mots attendus (Adj + Nom + Verbe)
        expect(identity.frequenceHEX).toMatch(/^#[0-9A-F]{6}$/i);
    });
});