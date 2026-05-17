import { getNeo4jSession } from '../../neo4j';
import { ISeed } from '@ilot/types'; // Assure-toi que c'est le bon chemin

// 💎 L'Alchimie TypeScript : On extrait uniquement ce dont le Graphe a besoin.
// Cela empêche l'email (donnée privée) de se retrouver accidentellement dans Neo4j.
export type OiseauEssence = Pick<ISeed, 'uid' | 'pseudo' | 'frequenceHEX'>;

/**
 * 🔗 FRANCHIR LA PORTE
 * Le Graphe ne voit que l'Alias et la Couleur. Il ne lit pas le Sanctuaire (email, etc).
 */
export const franchirLaPorte = async (oiseau: OiseauEssence) => { // 👈 On utilise l'Essence ici
  const session = getNeo4jSession();
  
  const cypher = `
    MERGE (o:Oiseau { uid: $uid })
    ON CREATE SET 
      o.pseudo = $pseudo,
      o.frequenceHEX = $frequenceHEX,
      o.premiereResonance = timestamp()
    ON MATCH SET
      o.pseudo = $pseudo,
      o.frequenceHEX = $frequenceHEX
      
    MERGE (ilot:Demeure { nom: 'Le Bordel de DhÖ' })
    MERGE (o)-[r:A_FRANCHI_LA_PORTE]->(ilot)
    SET r.derniereVisite = timestamp()
    
    RETURN o
  `;

  try {
    const result = await session.run(cypher, {
      uid: oiseau.uid,
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX
    });
    
    console.log(`✨ [Neo4j] La porte s'ouvre pour ${oiseau.pseudo}.`);
    return result.records[0].get('o').properties;
  } finally {
    await session.close();
  }
};

export const propagerCouleur = async (uid: string, frequenceHEX: string) => {
  const session = getNeo4jSession();
  const cypher = `MATCH (o:Oiseau { uid: $uid }) SET o.frequenceHEX = $frequenceHEX RETURN o`;
  try {
    await session.run(cypher, { uid, frequenceHEX });
  } finally {
    await session.close();
  }
};