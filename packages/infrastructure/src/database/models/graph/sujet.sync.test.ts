import { describe, it, expect } from 'vitest';
import { SujetRelationshipType, ISujetGraphNode, ISujetGraphContext } from '../graph/sujet.graph';

describe('Sujet Graph Contracts & Enums', () => {
    it('🟢 doit valider la présence de toutes les relations fondamentales du graphe (tom§hat§toes)', () => {
        expect(SujetRelationshipType.WROTE).toBe('WROTE');
        expect(SujetRelationshipType.ILLUMINATES).toBe('ILLUMINATES');
        expect(SujetRelationshipType.DETAILS).toBe('DETAILS');
        expect(SujetRelationshipType.OFFERS_PRODUCT).toBe('OFFERS_PRODUCT');
        expect(SujetRelationshipType.ECHOES).toBe('ECHOES');
        expect(SujetRelationshipType.UNLOCKS).toBe('UNLOCKS');
        expect(SujetRelationshipType.RESONATED_WITH).toBe('RESONATED_WITH');
    });

    it('🟢 doit valider la structure d\'un nœud Sujet pour Neo4j', () => {
        const node: ISujetGraphNode = {
            uid: 'sujet_neo_123',
            title: 'Chant des Sélénites',
            category: 'MONOLOGUE',
            status: 'DRAFT',
            createdAt: new Date(),
        };

        expect(node.uid).toBe('sujet_neo_123');
        expect(node.title).toBe('Chant des Sélénites');
        expect(node.category).toBe('MONOLOGUE');
    });

    it('🟢 doit valider le contexte des connexions du graphe pour un Sujet', () => {
        const context: ISujetGraphContext = {
            actorUid: 'bird_writer_1',
            sujetUid: 'sujet_neo_123',
            title: 'Chant des Sélénites',
            category: 'MONOLOGUE',
            status: 'PUBLISHED',
            relatedProjects: ['proj_1'],
            relatedTasks: ['task_1'],
            relatedProducts: ['prod_1'],
            relatedGames: ['game_1'],
            productId: 'prod_1',
        };

        expect(context.actorUid).toBe('bird_writer_1');
        expect(context.relatedProjects).toContain('proj_1');
        expect(context.relatedProducts).toContain('prod_1');
    });
});