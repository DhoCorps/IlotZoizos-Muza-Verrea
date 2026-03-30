import { runQuery } from '../neo4j'; 
import { UserModel } from '../models/nosql/user.model';
import { ProjectModel } from '../models/nosql/project.model';
import { ProjectRole } from '@ilot/types';

/**
 * 👤 SYNCHRONISATION OISEAU (User)
 */
export const syncUserToGraph = async (user: any) => {
  const cypher = `
    MERGE (u:User {uid: $uid})
    SET u.username = $username,
        u.email = $email,
        u.avatarUrl = $avatarUrl,
        u.updatedAt = datetime()
    RETURN u
  `;
  
  try {
    await runQuery(cypher, {
      uid: user.uid || user._id?.toString(), 
      username: user.username,
      email: user.email, 
      avatarUrl: user.avatarUrl || null
    });
    console.log(`✨ [Graphe] Sync réussie pour l'oiseau : ${user.username}`);
  } catch (error) {
    console.error("❌ Erreur syncUserToGraph :", error);
    throw error;
  }
};

/**
 * 🎖️ SYNCHRONISATION RÔLE
 * ⚡ FIX : Harmonisation de 'id' vers 'uid' pour matcher l'Orchestrateur et RoleForm
 */
export const syncRoleToGraph = async (role: any) => {
  const cypher = `
    MERGE (r:Role {uid: $uid}) 
    SET r.name = $name,
        r.color = $color,
        r.updatedAt = datetime()
    RETURN r
  `;
  try {
    // On s'assure d'utiliser les clés définies dans ton nouveau modèle 'Role'
    await runQuery(cypher, {
      uid: role.uid || role._id?.toString(),
      name: role.name || role.intitule,
      color: role.color || '#6366f1'
    });
    console.log(`✅ [Graphe] Rôle synchronisé : ${role.name || role.intitule}`);
  } catch (error) {
    console.error("❌ Erreur syncRoleToGraph :", error);
    throw error;
  }
};

/**
 * 🔗 INVITATION : Lie un oiseau à une équipe
 */
export const inviteMember = async (teamUid: string, userEmail: string, initialCaps: any[]) => {
  try {
    const user = await UserModel.findOne({ email: userEmail.toLowerCase() });
    if (!user) throw new Error("Cet oiseau n'est pas encore inscrit sur l'Îlot.");

    const query = `
      MATCH (u:User {uid: $userUid})
      MERGE (t:Team {uid: $teamUid})
      MERGE (u)-[r:MEMBER_OF]->(t)
      SET r.caps = $initialCaps, r.grantedAt = datetime()
      RETURN r
    `;
    await runQuery(query, { teamUid, userUid: user.uid, initialCaps });
    return { success: true, message: `Liaison établie pour ${user.username}.` };
  } catch (error: any) {
    console.error("❌ Erreur invitation (Graphe) :", error.message);
    throw error;
  }
};

/**
 * 🏗️ PROJET : Mise à jour synchronisée (Mongo + Neo4j)
 */
export const updateProjectSync = async (uid: string, data: any) => {
  try {
    const finaltitle = data.title || data.name;

    // 1. Mise à jour MongoDB
    const updatedMongo = await ProjectModel.findOneAndUpdate(
      { uid: uid },
      { $set: { 
          title: finaltitle, 
          description: data.description,
          status: data.status 
        } 
      },
      { new: true }
    );

    if (!updatedMongo) throw new Error("Projet introuvable dans MongoDB.");

    // 2. Mise à jour Neo4j
    const cypher = `
      MATCH (p:Project {uid: $uid})
      SET p.title = $title, p.updatedAt = datetime()
      RETURN p
    `;
    await runQuery(cypher, { uid: uid, title: finaltitle });

    return updatedMongo;
  } catch (error: any) {
    console.error("❌ Erreur synchro projet :", error.message);
    throw error;
  }
};

/**
 * 🔐 DROITS DANS LE GRAPHE (Relation User -> Project)
 */
export const updateUserProjectCapabilities = async (
  projectUid: string,
  targetUserUid: string,
  newRole: ProjectRole,
  newCaps: string[]
) => {
  const cypher = `
    MATCH (u:User {uid: $userUid})
    MATCH (p:Project {uid: $projectUid})
    MERGE (u)-[r:MEMBER_OF]->(p)
    SET r.role = $role,
        r.capabilities = $caps,
        r.updatedAt = datetime()
    RETURN r
  `;

  try {
    const records = await runQuery(cypher, {
      userUid: targetUserUid,
      projectUid: projectUid,
      role: newRole,
      caps: newCaps
    });

    if (records.records.length === 0) {
      throw new Error("Utilisateur ou Projet introuvable dans Neo4j.");
    }

    return records.records[0].get('r').properties;
  } catch (error) {
    console.error("❌ Erreur Neo4j (updateUserProjectCapabilities) :", error);
    throw error;
  }
};

/**
 * 🧹 DELETE BIRD
 */
export async function deleteBird(userUid: string): Promise<void> {
  try {
    await runQuery(
      'MATCH (u:User {uid: $userUid}) DETACH DELETE u',
      { userUid }
    );
    console.log(`✅ [Sync] Zoizo ${userUid} effacé du ciel de l'Îlot.`);
  } catch (error) {
    console.error(`❌ [Sync] Erreur lors de la suppression du Zoizo ${userUid}:`, error);
    throw error;
  }
}