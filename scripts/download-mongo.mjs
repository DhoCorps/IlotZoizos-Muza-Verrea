import { MongoMemoryServer } from 'mongodb-memory-server';

console.log("🐘 Préparation du téléchargement de MongoDB...");
console.log("Cette opération peut prendre quelques minutes selon ta connexion (environ 500Mo).");

try {
  const mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '8.2.1', // La version que tes tests réclament
    }
  });
  console.log("✅ MongoDB est bien téléchargé et stocké en cache !");
  await mongoServer.stop();
  process.exit(0);
} catch (e) {
  console.error("❌ Erreur pendant le téléchargement :", e);
  process.exit(1);
}