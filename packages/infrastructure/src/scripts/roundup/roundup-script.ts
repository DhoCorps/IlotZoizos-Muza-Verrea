import { connectToDatabase, RoleModel, PermissionModel } from '../..'; 
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

// 🦅 Chargement de l'environnement (Le Nexus)
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: resolve(process.cwd(), 'apps/hub-central/.env.local') });
}

async function runPurge() {
  try {
    console.log("🐘 [Silice] Connexion pour purification...");
    await connectToDatabase();

    // 1. Application du Désherbant
    console.log("🔥 Lancement de l'incendie contrôlé...");
    
    // On utilise directement les modèles importés
    const roleResult = await RoleModel.deleteMany({});
    const permResult = await PermissionModel.deleteMany({});

    console.log(`✅ Terrain purifié avec succès !`);
    console.log(`📉 Détails : ${roleResult.deletedCount} Rôle(s) et ${permResult.deletedCount} Permission(s) réduits en cendres.`);

  } catch (error) {
    console.error("❌ [Erreur] Échec du désherbage :");
  } finally {
    // 🧹 On referme le Nexus
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    process.exit(0);
  }
}

// Lancement du vol de nettoyage
runPurge();