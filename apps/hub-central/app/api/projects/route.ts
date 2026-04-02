import { NextResponse } from 'next/server';
import { ProjectOrchestrator } from '../../../../../packages/shared-core';
import { ProjectModel } from '@ilot/infrastructure';

/**
 * 📂 GET : Récupérer la liste des chantiers
 */
export async function GET() {
  try {
    const projects = await ProjectModel.find().sort({ 'dates.lastActivity': -1 });
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🌟 POST : Fondation d'un nouveau projet
 * Attend 'name', 'ownerUid', et les données du schéma IProject
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // On extrait le propriétaire technique pour le baguage Neo4j
    const { ownerUid, ...projectData } = body;
    
    if (!ownerUid) {
      return NextResponse.json({ error: "L'UID du propriétaire est requis pour le tissage." }, { status: 400 });
    }

    const result = await ProjectOrchestrator.fosterProject({
      ...projectData,
      ownerUid
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}