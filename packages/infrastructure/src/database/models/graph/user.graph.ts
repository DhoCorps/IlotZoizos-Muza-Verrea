import { getNeo4jSession } from '../../neo4j'; // Ton utilitaire de session

export const baguerOiseau = async (user: { 
  uid: string; // ✅ Aligné avec l'orchestrateur
  username: string; 
  role: string 
}) => {
  const session = getNeo4jSession();
  
  // ✅ On utilise u:User et $uid pour correspondre parfaitement aux données entrantes
  const cypher = `
    MERGE (u:User { uid: $uid })
    ON CREATE SET 
      u.username = $username,
      u.role = $role,
      u.dateArrivee = datetime(),
      u.status = 'Libre'
    RETURN u
  `;

  try {
    // La variable 'user' contient maintenant exactement { uid, username, role }
    // Ce qui correspond à 100% aux variables $uid, $username, $role de la requête
    const result = await session.run(cypher, user);
    console.log(`✨ [Neo4j] L'utilisateur ${user.username} est bagué dans le graphe.`);
    return result.records[0].get('u').properties;
  } finally {
    await session.close();
  }
};