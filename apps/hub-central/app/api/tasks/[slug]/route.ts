import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core';
import { authOptions } from "@/lib/auth";
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits (Ascendants via Projet + Directs via Tâche)
 * pour renvoyer le tableau complet des capacités requis pour la Signature.
 */
async function getTaskCapabilities(userUid: string, taskUid: string): Promise<string[]> {
  let session;
  try {
    session = getNeo4jSession();
    const cypher = `
      MATCH (t:Task {uid: $taskUid})
      OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
      
      // L'Oiseau est-il directement lié à l'Atome ?
      OPTIONAL MATCH (u1:User {uid: $userUid})-[rDirect:ASSIGNED_TO|CREATED]->(t)
      
      // A-t-il les pouvoirs sur le Chantier parent ?
      OPTIONAL MATCH (u2:User {uid: $userUid})-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
      OPTIONAL MATCH (u2)-[rTeam:MEMBER_OF|OWNER_OF|INVITED_TO]->(tTeam:Team)-[:HAS_PROJECT]->(p)
      
      RETURN 
        rDirect IS NOT NULL AS isDirectlyInvolved,
        rProj.capabilities AS projectCaps,
        tTeam.defaultProjectCapabilities AS teamDefaultCaps,
        type(rTeam) AS teamRel
    `;
    
    const result = await session.run(cypher, { userUid, taskUid });
    if (result.records.length === 0) return []; 

    const record = result.records[0];
    const isDirectlyInvolved = record.get('isDirectlyInvolved');
    const projectCaps = record.get('projectCaps') || [];
    const teamDefaultCaps = record.get('teamDefaultCaps') || [];
    const teamRel = record.get('teamRel');

    let compiledCaps = [...new Set([...projectCaps, ...teamDefaultCaps])];

    // SUTURE : Octroi des droits organiques (Lecture, Update, ET Delete pour les assignés/créateurs)
    if (isDirectlyInvolved) {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
        if (!compiledCaps.includes(CAPABILITIES.TASK.UPDATE)) compiledCaps.push(CAPABILITIES.TASK.UPDATE);
        if (!compiledCaps.includes(CAPABILITIES.TASK.DELETE)) compiledCaps.push(CAPABILITIES.TASK.DELETE);
    }

    // 🌟 VISITEUR D'HONNEUR : Droit d'observation accordé si invité au Nid parent
    if (teamRel === 'INVITED_TO') {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }

    return compiledCaps;
  } catch (error) {
    console.error("🔥 Fracture lors de la compilation d'Aura sur l'Atome :", error);
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
 * 🔍 GET : Ausculter un Atome spécifique (La Loupe)
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant d'atome invalide." }, { status: 400 });
    }

    const taskId = slugify(rawSlug || '');

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TASK GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let caps: string[] = [];
    try {
      caps = await getTaskCapabilities(userUid, taskId);
    } catch (capsErr) {
      console.error("🔥 [CAPS ERROR TASK GET]", capsErr);
    }

    if (!caps.includes(CAPABILITIES.TASK.READ) && !caps.includes('*')) {
        return NextResponse.json({ error: "L'accès à cet Atome t'est refusé." }, { status: 403 });
    }

    let task;
    try {
      task = await TaskModel.findOne({ uid: taskId }).lean();
    } catch (queryErr) {
      console.error("🔥 [TASK QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture dans la Silice." }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: "Atome non trouvé dans la silice." }, { status: 404 });
    }

    return NextResponse.json({ ...task, myCapabilities: caps }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Task:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

/**
 * 🚀 POST : Actions spécifiques sur un Atome (Création de sous-tâche / Sous-Atome Matrioshka)
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant d'atome invalide." }, { status: 400 });
    }

    const taskId = slugify(rawSlug || '');

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let caps: string[] = [];
    try {
      caps = await getTaskCapabilities(userUid, taskId);
    } catch (e) {}

    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Aura insuffisante pour agir sur cet Atome." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { action, data } = body;
    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    if (action === 'CREATE_SUBTASK') {
      try {
        const taskOrch = new TaskOrchestrator();
        const newSubTask = await taskOrch.fosterTask({
          ...data,
          parentUid: taskId
        }, signature);
        return NextResponse.json(newSubTask, { status: 201 });
      } catch (orchErr: any) {
        console.error("🌋 [TASK ORCHESTRATOR SUBTASK ERROR]", orchErr);
        const status = orchErr.statusCode || orchErr.status || 500;
        return NextResponse.json({ error: orchErr.message || "Échec de fondation de sous-atome." }, { status });
      }
    }

    return NextResponse.json({ error: "Mouvement inconnu sur cet Atome." }, { status: 400 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Task:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}

/**
 * 🛠️ PATCH : Mutation d'un Atome (Status, Pomodoros, etc.)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK PATCH]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant d'atome invalide." }, { status: 400 });
    }

    const taskId = slugify(rawSlug || '');

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let caps: string[] = [];
    try {
      caps = await getTaskCapabilities(userUid, taskId);
    } catch (e) {}

    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Tu ne peux pas faire muter cet Atome." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let updatedTask;
    try {
      const taskOrch = new TaskOrchestrator(); 
      updatedTask = await taskOrch.updateTask(taskId, body, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR UPDATE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la mutation de l'Atome." }, { status });
    }

    return NextResponse.json(updatedTask, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PATCH Task:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}

/**
 * 🗑️ DELETE : Désintégration d'un Atome (Le Silence)
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant d'atome invalide." }, { status: 400 });
    }

    const taskId = slugify(rawSlug || '');

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let caps: string[] = [];
    try {
      caps = await getTaskCapabilities(userUid, taskId);
    } catch (e) {}

    if (!caps.includes(CAPABILITIES.TASK.DELETE) && !caps.includes('*')) {
        return NextResponse.json({ error: "La désintégration de cet Atome requiert plus d'aura." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    try {
      const taskOrch = new TaskOrchestrator(); 
      await taskOrch.disintegrateTask(taskId, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR DISINTEGRATE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec du rituel de désintégration." }, { status });
    }
    
    return NextResponse.json({ message: "Atome rendu à la poussière du Nexus." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Task:", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}