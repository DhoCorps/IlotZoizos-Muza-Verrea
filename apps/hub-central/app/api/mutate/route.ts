// apps/hub-central/app/api/mutate/route.ts
import { NextResponse } from 'next/server';
import { CreateProjectSchema } from '@ilot/types';
import { ProjectOrchestrator } from '@ilot/shared-core'; // 👈 On utilise nos vrais outils !

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsedData = CreateProjectSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json({ error: "ADN invalide", details: parsedData.error.format() }, { status: 400 });
    }

    const projectData = parsedData.data;
    
    if (!projectData.ownerId) {
      return NextResponse.json({ error: "Signature du créateur (ownerId) manquante" }, { status: 400 });
    }

    // 🛡️ L'appel au Sceau de Transaction via l'Orchestrateur
    const newProject = await ProjectOrchestrator.createProject(projectData, projectData.ownerId);

    return NextResponse.json(
      { success: true, uid: newProject.uid, message: "Fragment synchronisé avec succès sous Sceau." }, 
      { status: 201 }
    );

  } catch (error: any) {
    console.error("🚨 [MUTATION ROUTE ERROR] :", error);
    return NextResponse.json(
      { error: "SYNC_ENGINE_FAILURE", message: error.message || "Échec de l'alignement." }, 
      { status: 500 }
    );
  }
}