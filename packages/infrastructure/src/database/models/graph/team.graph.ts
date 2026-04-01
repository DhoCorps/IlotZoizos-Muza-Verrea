import { getNeo4jSession } from '../../neo4j';

export const forgerNidDansGraphe = async (teamData: {
  teamUid: string;
  name: string;
  creatorUid: string;
  category: string;
  nuances: string[];
  isPrivate: boolean;
  parentId?: string;
}) => {
  const session = getNeo4jSession();

  // 📝 La Requête Cypher : La triple forge
  const cypher = `
    // 1. On s'assure que l'oiseau existe (on le trouve via son UID)
    MERGE (u:User { uid: $creatorUid })

    // 2. On forge le nid (Team)
    MERGE (t:Team { uid: $teamUid })
    ON CREATE SET 
      t.name = $name,
      t.category = $category,
      t.nuances = $nuances,
      t.isPrivate = $isPrivate,
      t.createdAt = datetime()

    // 3. On tisse le lien vital (L'oiseau devient ADMIN de son nid)
    MERGE (u)-[r:MEMBER_OF]->(t)
    ON CREATE SET r.role = 'ADMIN', r.since = datetime()

    // 4. (Optionnel) Si le nid a un parent, on crée la hiérarchie
    WITH t
    OPTIONAL MATCH (p:Team { uid: $parentId })
    FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
      MERGE (t)-[:CHILD_OF]->(p)
    )

    RETURN t
  `;

  try {
    // 🚀 On envoie la requête à la Gare Centrale
    const result = await session.run(cypher, {
      teamUid: teamData.teamUid,
      name: teamData.name,
      creatorUid: teamData.creatorUid,
      category: teamData.category,
      nuances: teamData.nuances,
      isPrivate: teamData.isPrivate,
      // Si parentId est undefined, on passe null pour Cypher
      parentId: teamData.parentId || null 
    });

    console.log(`✨ [Neo4j] Le nid "${teamData.name}" a été forgé et lié à l'oiseau ${teamData.creatorUid}.`);
    
    if (result.records.length === 0) {
      throw new Error("Neo4j n'a renvoyé aucun enregistrement après la création du nid.");
    }

    return result.records[0].get('t').properties;
  } finally {
    await session.close();
  }
};