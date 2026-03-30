import { RoleModel, PermissionModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';

export class RoleOrchestrator {
  
  static async createPermission(data: { intitule: string, code: string, description?: string }) {
    return await PermissionModel.create(data);
  }

  static async getAllPermissions() {
    return await PermissionModel.find({}).sort({ intitule: 1 }).lean();
  }

  static async getPermission(idOrUid: string) {
    const isObjectId = idOrUid.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: idOrUid } : { uid: idOrUid };
    
    const perm = await PermissionModel.findOne(query).lean();
    if (!perm) throw new Error("Permission introuvable dans les archives.");
    return perm;
  }

  static async createRole(data: { intitule: string, description?: string, status?: string, isSystem?: boolean, permissions?: any[] }) {
    const intituleNormalise = data.intitule.toUpperCase();

    return await TransactionManager.execute("Forge de Grade", async (mongoSession, neo4jTx) => {
      const [newRole] = await RoleModel.create([{
        ...data,
        intitule: intituleNormalise
      }], { session: mongoSession });

      const cypher = `
        MERGE (r:Role { mongodbId: $uid })
        ON CREATE SET r.intitule = $intitule, r.createdAt = datetime()
        ON MATCH SET r.intitule = $intitule
        RETURN r
      `;
      await neo4jTx.run(cypher, { uid: newRole.uid, intitule: intituleNormalise });

      return newRole;
    });
  }

  static async getAllRoles() {
    return await RoleModel.find({}).populate('permissions').sort({ intitule: 1 }).lean();
  }

  static async getRole(uid: string) {
    const role = await RoleModel.findOne({ uid }).populate('permissions').lean();
    if (!role) throw new Error("Ce grade n'existe pas dans le Bunker.");
    return role;
  }
}