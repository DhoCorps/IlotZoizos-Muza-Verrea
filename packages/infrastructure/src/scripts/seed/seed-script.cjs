const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 🦅 En .cjs, le require('..') cherche automatiquement le index.js
// Assure-toi que les fichiers compilés (.js) existent dans ces dossiers
const { connectToDatabase, RoleModel, PermissionModel } = require('../../'); 
const { RoleOrchestrator } = require('../../../../shared-core/src');
const { CAPABILITIES } = require('../../../../types');

// Chargement de l'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(process.cwd(), 'apps/hub-central/.env.local') });
}

async function runSeed() {
  try {
    console.log("🐘 [Silice] Connexion au Nexus via CJS...");
    await connectToDatabase();

    console.log("🧹 Nettoyage des anciennes tablettes...");
    await RoleModel.deleteMany({});
    await PermissionModel.deleteMany({});

    console.log("🔨 Forge des Permissions...");
    
    // On utilise les CAPABILITIES directement
    const p1 = await RoleOrchestrator.createPermission({ 
      intitule: 'Gérer la Volée', 
      code: CAPABILITIES.TEAM.MANAGE, 
      description: 'Ajouter ou bannir des oiseaux du Nid' 
    });
    
    const p2 = await RoleOrchestrator.createPermission({ 
      intitule: 'Forger des Fragments', 
      code: CAPABILITIES.PROJECT.CREATE, 
      description: 'Créer de nouveaux chantiers' 
    });
    
    const p3 = await RoleOrchestrator.createPermission({ 
      intitule: 'Détruire le Nid', 
      code: CAPABILITIES.TEAM.DELETE, 
      description: 'Purge absolue de l\'escouade' 
    });
    
    const p4 = await RoleOrchestrator.createPermission({ 
      intitule: 'Modifier les Privilèges', 
      code: CAPABILITIES.MEMBER.UPDATE, 
      description: 'Changer les rôles des autres membres' 
    });

    const p5 = await RoleOrchestrator.createPermission({ 
      intitule: 'Inviter des Oiseaux', 
      code: CAPABILITIES.MEMBER.INVITE, 
      description: 'Permet de connecter de nouvelles entités au Nid' 
    });

    const p6 = await RoleOrchestrator.createPermission({ 
      intitule: 'Bannir des Oiseaux', 
      code: CAPABILITIES.MEMBER.EXILE, 
      description: 'Permet d\'exclure définitivement un membre' 
    });

    const p7 = await RoleOrchestrator.createPermission({ 
      intitule: 'Construire Un Nid', 
      code: CAPABILITIES.TEAM.CREATE, 
      description: 'Permet de construire un nid' 
    });

    console.log("👑 Forge des Grades...");

    await RoleOrchestrator.createRole({ 
      intitule: 'ADMIN', 
      description: 'Superviseur absolu', 
      isSystem: true, 
      permissions: [p1._id, p2._id, p3._id, p4._id, p5._id, p6._id, p7._id] 
    });

    await RoleOrchestrator.createRole({ 
      intitule: 'BATISSEUR', 
      description: 'Ouvrier du Nid', 
      isSystem: true, 
      permissions: [p2._id, p5._id, p7._id] 
    });

    await RoleOrchestrator.createRole({ 
      intitule: 'MEMBRE', 
      description: 'Habitant de la Canopée', 
      isSystem: true, 
      permissions: [p2._id] 
    });
    
    console.log("✨ [Nexus] Le Livre des Sortilèges a été restauré !");

  } catch (error) {
    console.error("❌ [Erreur] Échec de la forge :", error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runSeed();