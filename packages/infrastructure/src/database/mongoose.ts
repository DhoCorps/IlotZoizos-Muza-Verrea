import mongoose from 'mongoose';

// 🎯 SUTURE : On simplifie le fallback pour éviter les erreurs de Replica Set en local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ilotzoizos?replicaSet=rs0';

if (!MONGODB_URI) {
  throw new Error('⚠️ Signal perdu : MONGODB_URI est introuvable dans la matrice (.env.local)');
}

// ⚡ OPTIMISATION 4 : Pré-calcul de la chaîne de log (évite un traitement CPU à chaque Cold Start)
const logUri = MONGODB_URI.split('@').pop();

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  // ⚡ OPTIMISATION 1 : Coupe-circuit synchrone ultra-rapide. 
  // Si le driver natif est déjà connecté (1), on sort instantanément.
  if (mongoose.connection.readyState === 1) {
    return cached.conn || mongoose;
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      // ⚡ OPTIMISATION 2 : Fail-fast. Ne met pas les requêtes en attente si la DB est down (crucial pour libérer la RAM en Next.js)
      bufferCommands: false, 
      maxPoolSize: 10,
      
      // ⚡ OPTIMISATION 3 : Empêche l'API de "pendre" pendant 30s (défaut) si le ReplicaSet est injoignable
      serverSelectionTimeoutMS: 5000, 
      connectTimeoutMS: 5000,
    };

    console.log(`🐘 [MongoDB] Tentative de connexion sur : ${logUri}`);

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