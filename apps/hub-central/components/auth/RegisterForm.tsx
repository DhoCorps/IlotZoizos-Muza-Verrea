'use client';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, UserModel } from "@ilot/infrastructure"; 
import { SyncOrchestrator, MoralChecker } from "@ilot/shared-core";
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    // 🛡️ 1. Moral Check
    const analysis = MoralChecker.analyze(username);
    if (!analysis.isSafe) {
      return NextResponse.json({ 
        error: analysis.suggestion || "Ce nom d'oiseau n'est pas autorisé sur l'Îlot." 
      }, { status: 400 });
    }

    await connectToDatabase();

    // 🛡️ 2. Vérification des doublons
    const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: 'Email ou Username déjà pris' }, { status: 400 });
    }

    // 🛡️ 3. Préparation et Écriture MongoDB
    const hashedPassword = await bcrypt.hash(password, 12);
    const mongoId = new mongoose.Types.ObjectId();
    const userUid = mongoId.toHexString(); // On définit l'UID technique ici

    const newUser = new UserModel({ 
      _id: mongoId,
      uid: userUid, 
      email: email.toLowerCase(), 
      username, 
      password: hashedPassword,
      role: "BATISSEUR", 
      signature: "<(:<" 
    });
    
    const savedUser = await newUser.save(); 
    console.log("✅ [MongoDB] L'oiseau est niché :", savedUser.uid);

    // 🛡️ 4. Synchronisation via l'Orchestrator (Neo4j)
    // SUTURE : On envoie 'uid' et non 'mongodbId' pour rester cohérent avec le graphe
    try {
      await SyncOrchestrator.syncUserCreation({ 
        uid: userUid,
        username: savedUser.username,
        role: savedUser.role 
      });
      console.log("🔥 [Neo4j] POINT MARQUÉ : Graphe synchronisé.");
    } catch (syncError) {
      console.error("⚠️ [Sync Engine] Échec de la suture Neo4j :", syncError);
    }

    return NextResponse.json({ 
      message: "L'oiseau a pris son envol !", 
      user: { uid: savedUser.uid, username: savedUser.username } 
    }, { status: 201 });

  } catch (error) {
    console.error("💥 [Register Error] :", error);
    return NextResponse.json({ error: "Erreur lors de l'incubation." }, { status: 500 });
  }
}