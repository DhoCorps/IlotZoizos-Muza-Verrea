import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { ProjectOrchestrator } from '@ilot/shared-core';
import { ProjectModel, getNeo4jSession, connectToDatabase } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { authOptions } from "@/lib/auth"; 

interface RouteParams { params: Promise<{ projectId: string }> }

async function getProjectCapabilities(userUid: string | undefined, projectUid: string) {
  if (!userUid) return { hasAccess: false, capabilities: [] as string[] };
  const session = getNeo4jSession();
  try {
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
    if (caps.length === 0 && relTypes.length === 0) return { hasAccess: false, capabilities: [] as string[] };
    if (relTypes.includes('INVITED_TO')) {
      if (!caps.includes('project:read')) caps.push('project:read');
      if (!caps.includes('task:read')) caps.push('task:read');
    }
    return { hasAccess: true, capabilities: caps };
  } catch (err) {
    console.error("🔥 Neo4j Capability Error:", err);
    return { hasAccess: false, capabilities: [] as string[] };
  } finally {
    await session.close();
  }
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    let resolvedParams;
    try { resolvedParams = await params; } catch (err) { return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 }); }

    try { await connectToDatabase(); } catch (dbErr) { return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 }); }

    let session;
    try { session = await getServerSession(authOptions); } catch (err) { return NextResponse.json({ error: "Erreur session." }, { status: 500 }); }
    
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    let project;
    try {
      project = await ProjectModel.findOne({ uid: resolvedParams.projectId }).select('-moderation.internalNotes').lean();
    } catch (err) { return NextResponse.json({ error: "Fracture de lecture." }, { status: 500 }); }
    
    if (!project) return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });

    const { hasAccess, capabilities } = await getProjectCapabilities(userUid, resolvedParams.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    const isPublic = project.visibility === 'PUBLIC' || project.visibility === 'OPEN_SOURCE';
    const hasReadPermission = mergedCaps.includes('project:read') || mergedCaps.includes('*') || project.creatorUid === userUid;

    if (!isPublic && !hasAccess && !hasReadPermission) {
      return NextResponse.json({ error: "Ce chantier est protégé. L'accès t'est refusé." }, { status: 403 });
    }

    return NextResponse.json({ ...project, myCapabilities: mergedCaps }, { status: 200 });
  } catch (error: any) { return NextResponse.json({ error: "Erreur globale." }, { status: 500 }); }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    let resolvedParams;
    try { resolvedParams = await params; } catch (err) { return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 }); }

    try { await connectToDatabase(); } catch (dbErr) { return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 }); }

    let session;
    try { session = await getServerSession(authOptions); } catch (err) { return NextResponse.json({ error: "Erreur session." }, { status: 500 }); }
    
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const sessionCaps = (session?.user as any)?.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, resolvedParams.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    let projectCheck;
    try { projectCheck = await ProjectModel.findOne({ uid: resolvedParams.projectId }).lean(); } catch(e) {}
    
    const isCreator = projectCheck?.creatorUid === userUid;
    const canUpdate = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.UPDATE) || mergedCaps.includes('*') || isCreator;
    
    if (!canUpdate) return NextResponse.json({ error: "Tu n'as pas l'aura requise pour muter ce Chantier." }, { status: 403 });

    let body;
    try { body = await req.json(); } catch (err) { return NextResponse.json({ error: "Corps invalide." }, { status: 400 }); }

    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };
    let updatedProject;
    try {
      const projectOrch = new ProjectOrchestrator();
      if (body.newFiles && Array.isArray(body.newFiles)) {
        await projectOrch.appendFiles(resolvedParams.projectId, body.newFiles, signature);
        delete body.newFiles; 
      }
      updatedProject = await projectOrch.mutateProject(resolvedParams.projectId, body, signature);
    } catch (orchErr: any) {
      return NextResponse.json({ error: orchErr.message || "Impossible de muter le projet." }, { status: orchErr.statusCode || 500 });
    }

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: any) { return NextResponse.json({ error: "Erreur globale." }, { status: 500 }); }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let resolvedParams;
    try { resolvedParams = await params; } catch (err) { return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 }); }

    try { await connectToDatabase(); } catch (dbErr) { return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 }); }

    let session;
    try { session = await getServerSession(authOptions); } catch (err) { return NextResponse.json({ error: "Erreur session." }, { status: 500 }); }
    
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const sessionCaps = (session?.user as any)?.capabilities || [];
    const { capabilities } = await getProjectCapabilities(userUid, resolvedParams.projectId);
    const mergedCaps = [...new Set([...capabilities, ...sessionCaps])];

    let projectCheck;
    try { projectCheck = await ProjectModel.findOne({ uid: resolvedParams.projectId }).lean(); } catch(e) {}
    
    const isCreator = projectCheck?.creatorUid === userUid;
    const canDelete = mergedCaps.includes(CAPABILITIES.SYSTEM.ALL) || mergedCaps.includes(CAPABILITIES.PROJECT.DELETE) || mergedCaps.includes('*') || isCreator;

    if (!canDelete) return NextResponse.json({ error: "Seul l'Architecte possède l'aura de dissolution." }, { status: 403 });

    const signature: ActionSignature = { actorUid: userUid, capabilities: mergedCaps };

    try {
      const projectOrch = new ProjectOrchestrator();
      await projectOrch.dissolveProject(resolvedParams.projectId, signature);
    } catch (orchErr: any) {
      return NextResponse.json({ error: orchErr.message || "Le rituel a échoué." }, { status: orchErr.statusCode || 500 });
    }
    
    return NextResponse.json({ message: "L'œuvre est retournée au silence.", status: "dissolved" }, { status: 200 }); 
  } catch (error: any) { return NextResponse.json({ error: "Erreur globale." }, { status: 500 }); }
}