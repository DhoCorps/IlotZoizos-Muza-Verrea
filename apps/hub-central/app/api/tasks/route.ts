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
  let session;
  try {
    session = getNeo4jSession();
    const result = await session.run(
      `MATCH (u:User {uid: $userUid})
       OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF]->(pDirect:Project {uid: $projectUid})
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
  } catch (error) {
    console.error("🔥 [PROJECT CAPS ERROR] Erreur lors de la compilation d'Aura ascendante :", error);
    return [];
  } finally {
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("⚠️ Erreur lors de la fermeture de la session Neo4j :", closeErr);
      }
    }
  }
}

/**
 * 🔍 GET : Parcourir les Atomes d'un Chantier (La Clairière)
 */
export async function GET(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE ET SESSIONS
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASKS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TASKS GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const projectUid = url.searchParams.get('projectUid');

    // -------------------------------------------------------------------------
    // 2. DOUANE TERRITORIALE SI UN CHANTIER EST SPÉCIFIÉ
    // -------------------------------------------------------------------------
    if (projectUid) {
      let project;
      try {
        project = await ProjectModel.findOne({ uid: projectUid }).lean();
      } catch (projQueryErr) {
        console.error("🔥 [PROJECT QUERY ERROR]", projQueryErr);
      }
      
      // 🪡 SUTURE DE SURVIE : Si la Silice a été vidée, on empêche le crash sur un Chantier fantôme
      if (!project) return NextResponse.json([], { status: 200 });

      let projectCaps: string[] = [];
      try {
        projectCaps = await getProjectCapabilities(userUid, projectUid);
      } catch (capsErr) {
        console.error("🔥 [PROJECT CAPS FETCH ERROR]", capsErr);
      }
      
      const isCreator = project?.creatorUid === userUid;
      const isArchitect = sessionCaps.includes('*');
      const canRead = isCreator || isArchitect || projectCaps.includes(CAPABILITIES.PROJECT.READ) || projectCaps.includes('*');

      if (!canRead) {
        return NextResponse.json({ error: "Accès au Chantier refusé." }, { status: 403 });
      }
    }

    // -------------------------------------------------------------------------
    // 3. SCRUTATION DU GRAPHE NEO4J (RÉCUPÉRATION DES IDENTIFIANTS)
    // -------------------------------------------------------------------------
    const neo4jSession = getNeo4jSession();
    let tasksFromGraph: Record<string, string[]> = {};

    try {
      let cypher = "";
      let params: any = {};

      if (projectUid) {
        // 🔒 SCÉNARIO 1 : Vue "Chantier" (Droits déjà validés ci-dessus)
        cypher = `
          MATCH (t:Task)-[:TASK_OF]->(p:Project {uid: $projectUid})
          OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t)
          RETURN t.uid AS taskUid, collect(bird.uid) AS assignees
        `;
        params.projectUid = projectUid;
      } else {
        // 🪡 SUTURE DE SÉCURITÉ ABSOLUE (SCÉNARIO 2) : Mode "Mes Atomes"
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
    } catch (neoErr) {
      console.error("🔥 [NEO4J TASKS GRAPH ERROR]", neoErr);
      return NextResponse.json({ error: "Le Graphe est momentanément muet." }, { status: 500 });
    } finally {
      if (neo4jSession) {
        try {
          await neo4jSession.close();
        } catch (closeErr) {
          console.error("⚠️ Erreur fermeture session Neo4j :", closeErr);
        }
      }
    }

    const taskUids = Object.keys(tasksFromGraph);
    if (taskUids.length === 0) return NextResponse.json([], { status: 200 });

    // -------------------------------------------------------------------------
    // 4. HYDRATATION SÉDIMENTAIRE VIA MONGODB (LA SILICE)
    // -------------------------------------------------------------------------
    let tasks;
    try {
      tasks = await TaskModel.find({ uid: { $in: taskUids } })
        .sort({ 'dates.updatedAt': -1 })
        .lean();
    } catch (mongoQueryErr) {
      console.error("🔥 [MONGO TASKS QUERY ERROR]", mongoQueryErr);
      return NextResponse.json({ error: "Échec de l'hydratation des Atomes dans la Silice." }, { status: 500 });
    }
      
    const hydrated = tasks.map(t => ({ 
      ...t, 
      assigneeUids: tasksFromGraph[t.uid] || [] 
    }));

    return NextResponse.json(hydrated, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture interne globale lors de la Clairière des Atomes (GET Tasks):", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

/**
 * 🚀 POST : Forger un nouvel Atome (Fondation)
 */
export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASKS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TASKS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const projectUid = body.projectUid;
    if (!projectUid) {
      return NextResponse.json({ error: "Un Atome doit obligatoirement être rattaché à un Chantier (projectUid)." }, { status: 400 });
    }

    let project;
    try {
      project = await ProjectModel.findOne({ uid: projectUid }).lean();
    } catch (projErr) {
      console.error("🔥 [PROJECT QUERY ERROR]", projErr);
    }

    if (!project) {
      return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });
    }

    let projectCaps: string[] = [];
    try {
      projectCaps = await getProjectCapabilities(userUid, projectUid);
    } catch (e) {}
    
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

    let newTask;
    try {
      const taskOrch = new TaskOrchestrator(); 
      newTask = await taskOrch.fosterTask(body, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR FOSTER ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'Îlot repousse la fondation de cet Atome." }, { status });
    }

    return NextResponse.json(newTask, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture interne globale lors du POST Tasks :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}