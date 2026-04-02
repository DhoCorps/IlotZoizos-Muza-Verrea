import { NextResponse } from 'next/server';
import { ProjectOrchestrator } from '../../../../../../packages/shared-core';
import { ProjectModel } from '../../../../../../packages/infrastructure';

/**
 * 🔍 GET : Ausculter un projet spécifique
 */
export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const project = await ProjectModel.findOne({ uid: params.projectId });
    
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable dans la silice." }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🎭 PUT : Mutation du projet (Roadmap, fichiers, santé)
 */
export async function PUT(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const body = await req.json();
    
    // Si des fichiers sont envoyés spécifiquement, on peut utiliser appendFiles
    if (body.newFiles) {
      await ProjectOrchestrator.appendFiles(params.projectId, body.newFiles);
      delete body.newFiles;
    }

    const updatedProject = await ProjectOrchestrator.mutateProject(params.projectId, body);

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🧨 DELETE : Dissolution totale (Mongo + Neo4j)
 */
export async function DELETE(req: Request, { params }: { params: { projectId: string } }) {
  try {
    await ProjectOrchestrator.dissolveProject(params.projectId);
    
    return NextResponse.json({ 
      message: "Le projet a été dissous. Les liens dans le graphe ont été rompus." 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}