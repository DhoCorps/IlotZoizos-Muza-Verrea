// apps/hub-central/app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; // 🪡 SUTURE : Approvisionnement direct au sanctuaire unique
import { connectToDatabase, getNeo4jSession } from '@ilot/infrastructure'; // 🪡 SUTURE DE CONNEXION : Import unifié pour préserver le Singleton Neo4j
import { TaskOrchestrator } from '@ilot/shared-core';
import { TaskModel, ProjectModel } from '@ilot/infrastructure';
import { CAPABILITIES, ActionSignature } from '@ilot/types';


/**
 * 🛡️ COMPILATEUR D'AURA ASCENDANTE
 * Résout de manière découplée si l'oiseau a le droit de lire le Chantier
 */
async function getProjectCapabilities(userUid: string, projectUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
       OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(pDirect:Project {uid: $projectUid})
       OPTIONAL MATCH (u)-[rTeam:MEMBER_OF|INVITED_TO]->(t:Team)-[:HAS_PROJECT]->(pTeam:Project {uid: $projectUid})
       RETURN r.capabilities AS directCaps, t.defaultProjectCapabilities AS teamCaps, type(rTeam) AS teamRel`,
      { userUid, projectUid }
    );
    if (result.records.length === 0) return [];
    
    const record = result.records[0];
    const direct = record.get('directCaps') || [];
    const team = record.get('teamCaps') || [];
    const teamRel = record.get('teamRel');
    
    let compiledCaps = [...new Set([...direct, ...team])];

    if (teamRel === 'INVITED_TO') {
      if (!compiledCaps.includes(CAPABILITIES.PROJECT.READ)) compiledCaps.push(CAPABILITIES.PROJECT.READ);
      if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }

    return compiledCaps;
  } finally {
    await session.close();
  }
}

/**
 * 🔍 GET : Parcourir les Atomes d'un Chantier (La Clairière)
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectUid = searchParams.get('projectUid');

    // 🛡️ DOUANE : Vérification des droits si un Chantier précis est demandé
    if (projectUid) {
      const project = await ProjectModel.findOne({ uid: projectUid }).lean();
      
      // 🪡 SUTURE DE SURVIE : Si la Silice a été vidée, on empêche le crash sur un Chantier fantôme
      if (!project) return NextResponse.json([]);

      const projectCaps = await getProjectCapabilities(userUid, projectUid);
      
      const isCreator = project?.creatorUid === userUid;
      const isArchitect = sessionCaps.includes('*');
      const canRead = isCreator || isArchitect || projectCaps.includes(CAPABILITIES.PROJECT.READ) || projectCaps.includes('*');

      if (!canRead) return NextResponse.json({ error: "Accès au Chantier refusé." }, { status: 403 });
    }

    const neo4jSession = getNeo4jSession();
    let tasksFromGraph: Record<string, string[]> = {};

    try {
      let cypher = "";
      let params: any = {};

      if (projectUid) {
        // 🔒 SCÉNARIO 1 : Vue "Chantier" (Droits déjà validés ci-dessus)
        // On récupère uniquement les tâches liées à CE projet précis.
        cypher = `
          MATCH (t:Task)-[:TASK_OF]->(p:Project {uid: $projectUid})
          OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t)
          RETURN t.uid AS taskUid, collect(bird.uid) AS assignees
        `;
        params.projectUid = projectUid;
      } else {
        // 🪡 SUTURE DE SÉCURITÉ ABSOLUE (SCÉNARIO 2) : Mode "Mes Atomes"
        // Aucun projectUid fourni = on ne renvoie QUE les tâches assignées à cet utilisateur.
        cypher = `
          MATCH (me:User {uid: $userUid})-[:ASSIGNED_TO]->(t:Task)
          OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t)
          RETURN t.uid AS taskUid, collect(bird.uid) AS assignees
        `;
        params.userUid = userUid;
      }

      const result = await neo4jSession.run(cypher, params);
      result.records.forEach(record => { 
        tasksFromGraph[record.get('taskUid')] = record.get('assignees'); 
      });
    } finally {
      await neo4jSession.close();
    }

    const taskUids = Object.keys(tasksFromGraph);
    if (taskUids.length === 0) return NextResponse.json([]);

    // 🔄 HYDRATATION via MongoDB (La Silice)
    const tasks = await TaskModel.find({ uid: { $in: taskUids } })
      .sort({ 'dates.updatedAt': -1 })
      .lean();
      
    const hydrated = tasks.map(t => ({ 
      ...t, 
      assigneeUids: tasksFromGraph[t.uid] || [] 
    }));

    return NextResponse.json(hydrated);
  } catch (error: any) {
    console.error("🔥 Fracture interne lors de la Clairière des Atomes (GET Tasks):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🚀 POST : Forger un nouvel Atome (Fondation)
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const body = await req.json();
    const projectUid = body.projectUid;

    const project = await ProjectModel.findOne({ uid: projectUid }).lean();
    if (!project) return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });

    const projectCaps = await getProjectCapabilities(userUid, projectUid);
    
    const isCreator = project.creatorUid === userUid;
    const isArchitect = sessionCaps.includes('*');
    const hasTaskRight = projectCaps.includes(CAPABILITIES.TASK.CREATE) || projectCaps.includes('*');

    if (!isCreator && !isArchitect && !hasTaskRight) {
      return NextResponse.json({ error: "Ton Aura ne résonne pas assez fort sur ce territoire." }, { status: 403 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: (isCreator || isArchitect) ? ['*'] : projectCaps 
    };

    const taskOrch = new TaskOrchestrator(); 
    // Le 'body' contient ici potentiellement { ..., scheduledAt: "..." }
    // qui sera traité par fosterTask dans task.orchestrator.ts
    const newTask = await taskOrch.fosterTask(body, signature);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Fracture interne lors du POST Tasks :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}