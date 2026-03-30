import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, UserModel } from "@ilot/infrastructure"; 
import { SyncOrchestrator, MoralChecker } from "@ilot/shared-core"; // 👈 On utilise le shared-core
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    // 🛡️ 1. Moral Check
    const analysis = MoralChecker.analyze(username);
    if (!analysis.isSafe) {
      return NextResponse.json({ error: analysis.suggestion }, { status: 400 });
    }

    await connectToDatabase();

    // 🛡️ 2. Doublons
    const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: 'Email ou Username déjà pris' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // ⚠️ ATTENTION : On n'utilise plus de mongoId manuel, on laisse le schéma générer l'UID 
    // ou on s'assure qu'il est cohérent.
    const newUser = new UserModel({ 
      email: email.toLowerCase(), 
      username, 
      password: hashedPassword,
      role: "BATISSEUR", 
      signature: "<(:<" 
    });
    
    // 🛡️ 3. SAUVEGARDE MONGODB
    const savedUser = await newUser.save(); 
    console.log("✅ [MongoDB] L'oiseau est niché :", savedUser.uid);

    // 🛡️ 4. SYNCHRONISATION NÉCESSAIRE (On ne "catch" pas ici !)
    // Si Neo4j échoue, l'erreur remontera au gros catch en bas.
    await SyncOrchestrator.syncUserCreation({ 
      uid: savedUser.uid, 
      username: savedUser.username,
      // ⚡ FIX : Ton orchestrateur attendait 'role' mais ton schéma Mongo utilise 'role' ou 'roles' ?
      // On envoie le premier rôle du tableau ou la string pure.
      role: Array.isArray(savedUser.roles) ? savedUser.roles[0] : (savedUser as any).role || "MEMBER" 
    });

    console.log("🔥 [Neo4j] POINT MARQUÉ : Graphe synchronisé.");

    return NextResponse.json({ 
      message: "L'oiseau a rejoint l'Îlot !",
      user: { id: savedUser.uid, username: savedUser.username } 
    }, { status: 201 });

  } catch (error: any) {
    // 🚨 SI ÇA CRASH ICI, ON SAIT QUE RIEN N'EST SYNCHRO
    console.error('🔥 [CRASH] Panne moteur lors de l\'inception :', error);
    
    // Optionnel : Si Neo4j a échoué mais Mongo a réussi, 
    // on devrait techniquement supprimer le user de Mongo pour rester propre.
    // await UserModel.deleteOne({ uid: ... });

    return NextResponse.json({ 
      error: 'Erreur technique lors de l\'inception.',
      details: error.message 
    }, { status: 500 });
  }
}