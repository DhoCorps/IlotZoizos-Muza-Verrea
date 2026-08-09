// scripts/syncUniversalMedia.ts
import mongoose from 'mongoose';
import { UniversalMediaModel } from '@ilot/infrastructure';
// Importe tes modèles sources existants selon ton architecture (ex: SujetModel, ProductModel, etc.)
// Assure-toi que ton script est exécuté avec l'environnement adéquat (dotenv chargé)

export async function syncAllAppsToUniversalRegistry() {
  console.log("🦅 [Matrice] Début de l'indexation globale des médias dans le Registre Universel...");

  try {
    // Connexion à la Silice si non connectée
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ilot');
      console.log("💾 Connecté à la Silice MongoDB.");
    }

    // 1. Nettoyage optionnel ou synchronisation incrémentale
    // On peut purger ou faire un upsert (mise à jour/création) par mediaId pour éviter les doublons.
    let indexedCount = 0;

    // --- EXEMPLE DE SYNCHRONISATION DES MONOLOGUES ABYSS ---
    // Remplace SujetModel par ton modèle Mongoose réel si besoin
    // const sujets = await SujetModel.find({ status: 'PUBLISHED' }).lean();
    // pour chaque sujet, on fait un upsert dans UniversalMediaModel :
    /*
    for (const sujet of sujets) {
      await UniversalMediaModel.findOneAndUpdate(
        { mediaId: sujet.uid },
        {
          mediaId: sujet.uid,
          sourceApp: 'ABYSS',
          ownerUid: sujet.authorUid || sujet.ownerUid || 'unknown',
          ownerSlug: sujet.authorName || 'anonyme',
          title: sujet.title,
          mediaUrl: sujet.media?.coverImageUrl || sujet.media?.audioTrackUrl || '',
          thumbnailUrl: sujet.media?.coverImageUrl,
          priceCents: sujet.merchLink?.priceCents || 0,
          consentForShowcase: !!sujet.settings?.consentForShowcase,
          consentForMusicSync: !!sujet.settings?.consentForMusicSync,
          createdAt: sujet.createdAt,
        },
        { upsert: true, new: true }
      );
      indexedCount++;
    }
    */

    console.log(`✨ [Matrice] Synchronisation achevée avec succès. ${indexedCount} artefacts indexés.`);
  } catch (error: any) {
    console.error("🔥 [Erreur Critique] Échec de la synchronisation universelle :", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Déconnexion de la Silice.");
  }
}

// Exécution directe si le script est lancé en CLI
if (require.main === module) {
  syncAllAppsToUniversalRegistry();
}