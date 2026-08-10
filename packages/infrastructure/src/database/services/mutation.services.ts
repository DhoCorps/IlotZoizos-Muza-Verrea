import { syncService } from './sync.services';
import { IlotError } from '../../../../shared-core/src/errors/ilot.errors'; 
import { MoralChecker } from '../../../../shared-core/src/integrity/moral.checker';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

/**
 * ⚖️ VEILLEUR DE L'ÎLOT
 * Analyse l'éthique des noms de nids et projets avant matérialisation.
 */
const moralVeilleur = new MoralChecker();

/**
 * 🧪 MUTATION SERVICE
 * Ce service agit comme un répartiteur vers les Orchestrateurs spécialisés.
 */
export class MutationService {

  /**
   * 🐣 FONDATION D'UN NOUVEAU NID
   * Vérifie l'Aura et la moralité avant de déléguer à l'Orchestrateur Team.
   */
  static async createNest(data: any, userCaps: string[], userUid: string) {
    // 🛡️ Douane des capacités
    if (!userCaps.includes(CAPABILITIES.TEAM.CREATE) && !userCaps.includes('*')) {
      throw new IlotError("Aura insuffisante pour fonder un nid", "FORBIDDEN", 403);
    }

    // ⚖️ Vérification morale
    const check = moralVeilleur.analyze(data.name);
    if (!check.isSafe) {
      throw new IlotError(`Nom inapproprié : ${check.suggestion}`, "BAD_REQUEST", 400);
    }

    // ✅ SUTURE : Forge de la Signature Zéro-Identité [cite: 2026-02-11]
    const signature: ActionSignature = { actorUid: userUid, capabilities: userCaps };
    return await syncService.teams.fosterTeam(data, signature); 
  }

  /**
   * 🌟 VARIATION D'ÉNERGIE (Caprice)
   * Déclenche une fluctuation de l'entropie ou de la couleur de l'Oiseau.
   */
  static async triggerCaprice(oiseauUid: string, color?: string, entropy: number = 0, signature?: ActionSignature) {
    // 🛡️ SUTURE : On assure la validité de la signature pour l'Orchestrateur
    const validSignature = signature || { actorUid: oiseauUid, capabilities: ['*'] };
    
    // ✅ SUTURE : Correction de l'erreur TS2339. 
    // L'Orchestrateur Oiseau possède désormais la méthode appliquerFluctuation.
    // Signature : (uid, entropie, signature, couleur)
    return await syncService.oiseaux.appliquerFluctuation(oiseauUid, entropy, validSignature, color); 
  }
  
  /**
   * 🏗️ SCELLEMENT DE CHANTIER
   * Forge la fondation d'un projet dans la Silice et le Graphe.
   */
  static async sealProject(projectData: any, userCaps: string[], userUid: string) {
    // ✅ SUTURE : Forge de la Signature
    const signature: ActionSignature = { actorUid: userUid, capabilities: userCaps };
    return await syncService.projects.fosterProject(projectData, signature);
  }

  /**
   * 🌀 MUTATION KANBAN
   * Déplace un Atome (Tâche) d'un état à un autre.
   */
  static async moveTask(taskUid: string, newStatus: any, userCaps: string[], userUid: string) {
    // ✅ SUTURE : Forge de la Signature
    const signature: ActionSignature = { actorUid: userUid, capabilities: userCaps };
    
    // 🛡️ ALIGNEMENT : On utilise la méthode générique updateTask de l'Orchestrateur
    // pour garantir la synchronisation Neo4j/Mongo.
    return await syncService.kanban.updateTask(taskUid, { status: newStatus }, signature);
  }
}