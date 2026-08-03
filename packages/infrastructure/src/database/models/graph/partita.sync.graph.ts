import { getNeo4jSession } from '../../neo4j';
import { IPartitaGraphContext } from './partita.graph';

export const ancrerPartitaDansGraphe = async (data: IPartitaGraphContext) => {
  const session = getNeo4jSession();

  const cypher = `
    MERGE (o:Oiseau { uid: $authorUid })
    MERGE (p:Partita { uid: $uid })
    ON CREATE SET 
      p.title = $title,
      p.instrument = $instrument,
      p.format = $format,
      p.visibility = $visibility,
      p.createdAt = datetime()
    ON MATCH SET
      p.title = $title,
      p.instrument = $instrument,
      p.format = $format,
      p.visibility = $visibility

    MERGE (o)-[:COMPOSED]->(p)

    // Maillage optionnel avec les chantiers/projets
    WITH p
    UNWIND $relatedProjects AS projUid
    MATCH (proj:Project { uid: projUid })
    MERGE (p)-[:LINKED_TO_PROJECT]->(proj)

    // Maillage optionnel avec le produit e-commerce associé
    WITH p
    FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
      MERGE (prod:Product { uid: $productId })
      MERGE (p)-[:OFFERS_PRODUCT]->(prod)
    )

    RETURN p
  `;

  try {
    const result = await session.run(cypher, {
      uid: data.uid,
      authorUid: data.authorUid,
      title: data.title,
      instrument: data.instrument,
      format: data.format,
      visibility: data.visibility,
      relatedProjects: data.relatedProjects || [],
      productId: data.productId || null
    });

    console.log(`✨ [Neo4j] Partition "${data.title}" ancrée et reliée dans la matrice.`);
    return result.records[0]?.get('p').properties;
  } finally {
    await session.close();
  }
};