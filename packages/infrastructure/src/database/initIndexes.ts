// packages/infrastructure/src/database/neo4j/initIndexes.ts
import { Driver } from 'neo4j-driver';

/**
 * ⚡ Initialise les contraintes d'unicité et les index dans la matrice Neo4j
 * Garantit des recherches instantanées O(1) sous forte charge.
 */
export async function initializeNeo4jIndexes(driver: Driver): Promise<void> {
    const session = driver.session();
    
    // Liste des contraintes et index indispensables pour l'Îlot
    const constraintsAndIndexes = [
        // Utilisateurs (Oiseaux)
        `CREATE CONSTRAINT user_uid_unique IF NOT EXISTS FOR (u:User) REQUIRE u.uid IS UNIQUE`,
        `CREATE CONSTRAINT user_slug_unique IF NOT EXISTS FOR (u:User) REQUIRE u.slug IS UNIQUE`,
        
        // Nids (Teams)
        `CREATE CONSTRAINT team_slug_unique IF NOT EXISTS FOR (t:Team) REQUIRE t.slug IS UNIQUE`,
        `CREATE CONSTRAINT team_uid_unique IF NOT EXISTS FOR (t:Team) REQUIRE t.uid IS UNIQUE`,

        // Atomes (Tasks)
        `CREATE CONSTRAINT task_uid_unique IF NOT EXISTS FOR (task:Task) REQUIRE task.uid IS UNIQUE`,

        // Projets & Sujets
        `CREATE CONSTRAINT project_uid_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.uid IS UNIQUE`,
        `CREATE CONSTRAINT sujet_slug_unique IF NOT EXISTS FOR (s:Sujet) REQUIRE s.slug IS UNIQUE`,

        // Letr'In & Partita
        `CREATE CONSTRAINT font_uid_unique IF NOT EXISTS FOR (f:Font) REQUIRE f.uid IS UNIQUE`,
        `CREATE CONSTRAINT partition_uid_unique IF NOT EXISTS FOR (pt:Partition) REQUIRE pt.uid IS UNIQUE`
    ];

    try {
        console.log('🕸️ [Neo4j] Déploiement des autoroutes indexées dans la matrice...');
        
        for (const query of constraintsAndIndexes) {
            await session.run(query);
        }
        
        console.log('🟢 [Neo4j] Matrice indexée et scellée avec succès ! Zéro Full Scan en vue.');
    } catch (error) {
        console.error('🔥 [Neo4j Index Error] Échec de l\'indexation de la matrice :', error);
        throw error;
    } finally {
        await session.close();
    }
}