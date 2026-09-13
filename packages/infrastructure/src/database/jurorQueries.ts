import neo4j, { Driver } from 'neo4j-driver';

/**
 * Trouve un nombre d'oiseaux totalement neutres (sans lien direct ou indirect de 1er/2nd degré).
 */
export async function findImpartialJurors(
  driver: Driver,
  userAId: string,
  userBId: string,
  count: number = 5
): Promise<string[]> {
  const session = driver.session();
  try {
    const query = `
      MATCH (u:User)
      WHERE u.userId <> $userAId AND u.userId <> $userBId
        AND NOT (u)-[:INTERACTS_WITH*1..2]-( {userId: $userAId} )
        AND NOT (u)-[:INTERACTS_WITH*1..2]-( {userId: $userBId} )
      RETURN u.userId AS jurorId
      ORDER BY rand()
      LIMIT toInteger($count)
    `;

    const result = await session.run(query, {
      userAId,
      userBId,
      count: neo4j.int(count)
    });

    return result.records.map(record => record.get('jurorId') as string);
  } catch (error) {
    console.error("Erreur lors de la recherche des jurés impartiaux dans Neo4j :", error);
    throw error;
  } finally {
    await session.close();
  }
}