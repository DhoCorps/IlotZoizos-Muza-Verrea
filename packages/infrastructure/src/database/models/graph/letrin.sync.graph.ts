import { getNeo4jSession } from '../../neo4j';
import { ILetrinGraphContext } from '../../models/graph/letrin.graph';

export const ancrerLetrinDansGraphe = async (data: ILetrinGraphContext) => {
  const session = getNeo4jSession();

  const cypher = `
    MERGE (o:Oiseau { uid: $authorUid })
    MERGE (l:LetrinSprite { uid: $uid })
    ON CREATE SET 
      l.title = $title,
      l.resolution = $resolution,
      l.visibility = $visibility,
      l.createdAt = datetime()
    ON MATCH SET
      l.title = $title,
      l.resolution = $resolution,
      l.visibility = $visibility

    MERGE (o)-[:SCULPTED]->(l)

    // Maillage optionnel avec les projets
    WITH l
    UNWIND $relatedProjects AS projUid
    MATCH (proj:Project { uid: projUid })
    MERGE (l)-[:LINKED_TO_PROJECT]->(proj)

    // Maillage optionnel avec le produit e-commerce associé
    WITH l
    FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
      MERGE (prod:Product { uid: $productId })
      MERGE (l)-[:OFFERS_PRODUCT]->(prod)
    )

    RETURN l
  `;

  try {
    const result = await session.run(cypher, {
      uid: data.uid,
      authorUid: data.authorUid,
      title: data.title,
      resolution: data.resolution,
      visibility: data.visibility,
      relatedProjects: data.relatedProjects || [],
      productId: data.productId || null
    });

    console.log(`✨ [Neo4j] Projet Letr'In "${data.title}" sculpté et ancré dans le graphe.`);
    return result.records[0]?.get('l').properties;
  } finally {
    await session.close();
  }
};