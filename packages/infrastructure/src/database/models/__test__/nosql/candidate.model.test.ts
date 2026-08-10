import { describe, it, expect } from 'vitest';
import { CandidateModel } from '../../nosql/candidate.model';

describe('Candidate Model', () => {
    it('🟢 doit valider un objet candidat conforme avec les valeurs par défaut', () => {
        const validData = {
            uid: 'cand_123',
            nom: 'Jean Dupond',
            email: 'jean@ilot.fr',
            poste: 'Architecte Canopée',
        };

        const candidate = new CandidateModel(validData);
        expect(candidate.uid).toBe('cand_123');
        expect(candidate.nom).toBe('Jean Dupond');
        expect(candidate.status).toBe('nouveau');
        expect(candidate.createdAt).toBeDefined();
    });

    it('🔴 doit rejeter un candidat avec un statut non valide', () => {
        const invalidData = {
            uid: 'cand_456',
            nom: 'Marie Curieuse',
            email: 'marie@ilot.fr',
            poste: 'Orchestratrice',
            status: 'en_attente_invalide',
        };

        const error = new CandidateModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });
});