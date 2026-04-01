import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, UserModel, RoleModel } from "@ilot/infrastructure"; 
import { UserOrchestrator, MoralChecker } from "@ilot/shared-core";
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
    
    // Récupération du grade de base
    const gradeMembre = await RoleModel.findOne({ intitule: 'MEMBRE' });

    if (!gradeMembre) {
      return NextResponse.json({ error: "Le grade 'MEMBRE' n'a pas encore été forgé dans le système." }, { status: 500 });
    }

    const newUser = new UserModel({ 
      email: email.toLowerCase(), 
      username, 
      password: hashedPassword,
      // ✅ Dans MongoDB, on garde bien 'roles' au pluriel avec un tableau (ObjectId)
      roles: [gradeMembre._id], 
      signature: "<(:<" 
    });
    
    // 🛡️ 3. SAUVEGARDE MONGODB
    const savedUser = await newUser.save(); 
    console.log("✅ [MongoDB] L'oiseau est niché :", savedUser.uid);

    // 🛡️ 4. SYNCHRONISATION NEO4J
    await UserOrchestrator.syncUserCreation({ 
      uid: savedUser.uid, 
      username: savedUser.username,
      // ✅ CORRECTION VITALE : "role" au singulier, et on envoie l'UID sous forme de string pure !
      role: gradeMembre.uid,
      roles: [gradeMembre.uid]
    });

    console.log("🔥 [Neo4j] POINT MARQUÉ : Graphe synchronisé.");

    return NextResponse.json({ 
      message: "L'oiseau a rejoint l'Îlot !",
      user: { id: savedUser.uid, username: savedUser.username } 
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [CRASH] Panne moteur lors de l\'inception :', error);
    
    return NextResponse.json({ 
      error: 'Erreur technique lors de l\'inception.',
      details: error.message 
    }, { status: 500 });
  }
}