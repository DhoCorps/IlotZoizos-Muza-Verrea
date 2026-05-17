// packages/infrastructure/src/database/mongoose.ts
import mongoose from 'mongoose';

// 🎯 SUTURE : On simplifie le fallback pour éviter les erreurs de Replica Set en local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password1234@127.0.0.1:27017/ilotzoizos';
if (!MONGODB_URI) {
  throw new Error('⚠️ Signal perdu : MONGODB_URI est introuvable dans la matrice (.env.local)');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: 10,
      // 🛡️ Ajout de sécurités pour l'authentification
      authSource: "admin", 
      connectTimeoutMS: 5000,
    };

    console.log(`🐘 [MongoDB] Tentative de connexion sur : ${MONGODB_URI.split('@').pop()}`);

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("✅ [MongoDB] Connexion établie (ilotzoizos).");
        return m;
      })
      .catch((err) => {
        console.error("❌ [MongoDB] Échec de la Suture :", err.message);
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}