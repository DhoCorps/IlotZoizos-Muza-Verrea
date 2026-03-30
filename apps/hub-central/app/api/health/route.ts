import { NextResponse } from 'next/server';
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure';

export const dynamic = 'force-dynamic'; // Empêche Next.js de mettre cette route en cache

export async function GET() {
  const status = {
    nexus: 'ONLINE',
    mongodb: 'DOWN',
    neo4j: 'DOWN',
    timestamp: new Date().toISOString(),
  };

  let isHealthy = true;

  // 🍃 1. Test du pouls MongoDB
  try {
    await connectToDatabase();
    // Si la promesse se résout, c'est que le ping interne a fonctionné
    status.mongodb = 'UP';
  } catch (error) {
    console.error("🚨 [HEALTH] MongoDB est injoignable :", error);
    isHealthy = false;
  }

  // 🕸️ 2. Test du pouls Neo4j

  const session = getNeo4jSession();

  try {
    // On lance la requête la plus légère possible pour vérifier la connexion Bolt
    await session.run('RETURN 1 AS pulse');
    status.neo4j = 'UP';
  } catch (error) {
    console.error("🚨 [HEALTH] Neo4j est injoignable :", error);
    isHealthy = false;
  }finally {
    await session.close();
  }

  // 3. Réponse du Hub Central
  // On renvoie un code 200 si tout va bien, ou 503 (Service Unavailable) si une base est tombée
  return NextResponse.json(status, { status: isHealthy ? 200 : 503 });
}