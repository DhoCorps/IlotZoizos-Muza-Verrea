// apps/hub-central/app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel } from '@ilot/infrastructure';
import { getNeo4jSession } from '@ilot/infrastructure/src/database/neo4j';
import { connectToDatabase } from '@ilot/infrastructure'; // ✅ SUTURE : Import de l'éveil de la Silice
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { authOptions } from "../../../../lib/auth"; // 🌟 SUTURE : Import de la boussole d'Aura pour éclairer getServerSession

/**
 * 🛡️ UTILITAIRE DE DOUANE
 * Vérifie si l'Oiseau possède la capacité requise sur ce Projet dans le Graphe.
 */
async function getProjectCapabilities(userUid: string | undefined, projectUid: string) {
  if (!userUid) return { hasAccess: false, capabilities: [] as string[] };

  const session = getNeo4jSession();
  try {
    // 🪡 SUTURE : Analyse territoriale complète incluant la passerelle d'invitation du Nid parent
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
       OPTIONAL MATCH (u)-[rDirect:CONTRIBUTES_TO|OWNER_OF]->(p:Project {uid: $projectUid})
       OPTIONAL MATCH (u)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(p:Project {uid: $projectUid})
       WITH collect(rDirect.capabilities) + collect(rTeam.capabilities) AS compiledCaps, 
            collect(type(rTeam)) AS relTypes
       RETURN DISTINCT compiledCaps, relTypes`,
      { userUid, projectUid }
    );
    
    if (result.records.length === 0) return { hasAccess: false, capabilities: [] as string[] };
    
    const record = result.records[0];
    let caps = record.get('compiledCaps').flat().filter(Boolean) as string[];
    const relTypes = record.get('relTypes') as string[];
    
    if (caps.length === 0 && relTypes.length === 0) {
      return { hasAccess: false, capabilities: [] as string[] };
    }
    
    // 🌟 VISITEUR D'HONNEUR : Si l'oiseau est invité, on lui octroie d'office le droit de lecture
    if (relTypes.includes('INVITED_TO')) {
      if (!caps.includes('project:read')) caps.push('project:read');
      if (!caps.includes('task:read')) caps.push('task:read');
    }
    
    return { hasAccess: true, capabilities: caps };
  } finally {
    await session.close();
  }
}

/**
 * 🔍 GET : Ausculter un projet spécifique (La Loupe)
 */
export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    await connectToDatabase(); // 🛡️ Réveil de la Silice
    
    // 🪡 SUTURE : On passe authOptions pour redonner la vue à la session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    const project = await ProjectModel.findOne({ uid: params.projectId })
      .select('-moderation.internalNotes')
      .lean();
    
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable dans la silice." }, { status: 404 });
    }

    // 🛡️ Logique de Démopraxie
    const { hasAccess, capabilities } = await getProjectCapabilities(userUid, params.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    const isPublic = project.visibility === 'PUBLIC' || project.visibility === 'OPEN_SOURCE';
    const hasReadPermission = mergedCaps.includes('project:read') || mergedCaps.includes('*') || project.creatorUid === userUid;

    if (!isPublic && !hasAccess && !hasReadPermission) {
      return NextResponse.json({ error: "Ce chantier est protégé. L'accès t'est refusé." }, { status: 403 });
    }

    // L'HYDRATATION : Pouvoirs de l'Oiseau attachés au projet
    const hydratedProject = {
      ...project,
      myCapabilities: mergedCaps
    };
    
    return NextResponse.json(hydratedProject);
  } catch (error: any) {
    console.error(`🔥 Erreur d'auscultation (GET Project ${params.projectId}):`, error);
    return NextResponse.json({ error: "Le murmure s'est brisé." }, { status: 500 });
  }
}

/**
 * 🎭 PUT : Mutation du Chantier
 */
export async function PUT(req: Request, { params }: { params: { projectId: string } }) {
  try {
    await connectToDatabase(); // 🛡️ Réveil de la Silice
    
    // 🪡 SUTURE : On passe authOptions pour redonner la vue à la session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const sessionCaps = (session?.user as any)?.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, params.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    const projectCheck = await ProjectModel.findOne({ uid: params.projectId }).lean();
    const isCreator = projectCheck?.creatorUid === userUid;

    const canUpdate = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || 
                      mergedCaps.includes(CAPABILITIES.PROJECT.UPDATE) || 
                      mergedCaps.includes('*') ||
                      isCreator;
    
    if (!canUpdate) {
      return NextResponse.json({ error: "Tu n'as pas l'aura requise pour muter ce Chantier." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: mergedCaps
    };

    const body = await req.json();
    const projectOrch = new ProjectOrchestrator();
    
    if (body.newFiles && Array.isArray(body.newFiles)) {
      await projectOrch.appendFiles(params.projectId, body.newFiles, signature);
      delete body.newFiles; 
    }

    const updatedProject = await projectOrch.mutateProject(params.projectId, body, signature);

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error(`🔥 Erreur de mutation (PUT Project ${params.projectId}):`, error);
    return NextResponse.json({ error: error.message || "Impossible de muter le projet." }, { status });
  }
}

/**
 * 🛡️ DELETE : Dissolution totale (Le Deuil)
 */
export async function DELETE(req: Request, { params }: { params: { projectId: string } }) {
  try {
    await connectToDatabase(); // 🛡️ Réveil de la Silice
    
    // 🪡 SUTURE : On passe authOptions pour redonner la vue à la session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const sessionCaps = (session?.user as any)?.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, params.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    const projectCheck = await ProjectModel.findOne({ uid: params.projectId }).lean();
    const isCreator = projectCheck?.creatorUid === userUid;

    const canDelete = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || 
                      mergedCaps.includes(CAPABILITIES.PROJECT.DELETE) || 
                      mergedCaps.includes('*') ||
                      isCreator;

    if (!canDelete) {
      return NextResponse.json({ error: "Seul l'Architecte de ce Chantier possède l'aura de dissolution." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: mergedCaps
    };

    const projectOrch = new ProjectOrchestrator();
    await projectOrch.dissolveProject(params.projectId, signature);
    
    return NextResponse.json({ 
      message: "L'œuvre est retournée au silence. Les nœuds dans le graphe ont été tranchés.",
      status: "dissolved"
    }, { status: 200 }); 
  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error(`🔥 Erreur de dissolution (DELETE Project ${params.projectId}):`, error);
    return NextResponse.json({ error: error.message || "Le rituel de dissolution a échoué." }, { status });
  }
}