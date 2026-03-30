import mongoose from 'mongoose';

/**
 * 🎯 IDENTIFIANT DE FRÉQUENCE : ilotzoizos
 * On privilégie la variable d'environnement pour le Replica Set, 
 * avec un fallback de secours sur le localhost.
 */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password1234@127.0.0.1:27017/ilotzoizos?replicaSet=rs0&authSource=admin';

if (!MONGODB_URI) {
  throw new Error('⚠️ Signal perdu : MONGODB_URI est introuvable dans la matrice (.env.local)');
}

/**
 * Le cache global est notre ancrage pour éviter de multiplier les connexions 
 * lors des rechargements (Hot Reload) de Next.js.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  // 1. Si le pont est déjà établi, on traverse.
  if (cached.conn) {
    return cached.conn;
  }

  // 2. Si aucune promesse de Suture n'existe, on lance l'inception.
  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Crucial pour éviter les erreurs d'appels prématurés
      maxPoolSize: 10,
    };

    console.log(`🐘 [MongoDB] Tentative de connexion sur la base : ilotzoizos...`);

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(async (m) => {
        try {
          // 🛡️ Vérification réelle : On envoie un ping au cœur de la base
          await m.connection.db!.admin().ping();
          console.log("✅ [MongoDB] Connexion établie et vérifiée sur 'rs0' (ilotzoizos).");
          return m;
        } catch (pingError) {
          console.error("❌ [MongoDB] Le serveur ne répond pas au ping métabolique.");
          throw pingError;
        }
      })
      .catch((err) => {
        console.error("❌ [MongoDB] Échec critique de la Suture :", err.message);
        cached.promise = null; // On libère la promesse pour permettre une nouvelle tentative
        throw err;
      });
  }

  // 3. On attend que la promesse se stabilise en connexion réelle.
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;