import { NextResponse } from 'next/server';
import { connectToDatabase } from "@ilot/infrastructure";
import { RoleOrchestrator } from "@ilot/shared-core"; 

export const dynamic = 'force-dynamic';

/**
 * 🛰️ GET : Récupérer la hiérarchie complète
 */
export async function GET() {
  try {
    await connectToDatabase();
    // L'Orchestrateur fait le travail (Mongo + populate des permissions)
    const roles = await RoleOrchestrator.getAllRoles();
    return NextResponse.json(roles, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erreur API [GET /roles]:", error.message);
    return NextResponse.json(
      { error: "Impossible de scanner le registre des rôles." },
      { status: 500 }
    );
  }
}

/**
 * 🔨 POST : Forger un nouveau grade
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.intitule) {
      return NextResponse.json(
        { error: "L'intitulé du rôle est obligatoire pour la forge." },
        { status: 400 }
      );
    }

    // 🏗️ Appel à l'Orchestrateur (qui va écrire dans Mongo ET Neo4j)
    const newRole = await RoleOrchestrator.createRole(body);

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: any) {
    console.error("❌ Erreur API [POST /roles]:", error.message);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Ce grade existe déjà dans les archives du Bunker." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "La forge a échoué : " + error.message },
      { status: 500 }
    );
  }
}