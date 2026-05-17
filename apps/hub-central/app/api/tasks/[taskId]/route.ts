// apps/hub-central/app/api/tasks/[taskId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure'; 
import { TaskOrchestrator } from '@ilot/shared-core/src/sync-engine/task.orchestrator';
import { TaskModel } from '@ilot/infrastructure/src/database/models/nosql/task.model';
import { getNeo4jSession } from '@ilot/infrastructure/src/database/neo4j';
import { authOptions } from "../../../../lib/auth";
import { CAPABILITIES, ActionSignature } from '@ilot/types';

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique à l'Atome)
 * Compile les droits (Ascendants via Projet + Directs via Tâche)
 * pour renvoyer le tableau complet des capacités requis pour la Signature.
 */
async function getTaskCapabilities(userUid: string, taskUid: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
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

    // SUTURE : Octroi des droits organiques
    if (isDirectlyInvolved) {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
        if (!compiledCaps.includes(CAPABILITIES.TASK.UPDATE)) compiledCaps.push(CAPABILITIES.TASK.UPDATE);
    }

    // 🌟 VISITEUR D'HONNEUR : Droit d'observation accordé si invité au Nid parent
    if (teamRel === 'INVITED_TO') {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
    }

    return compiledCaps;
  } finally {
    await session.close();
  }
}

/**
 * 🔍 GET : Ausculter un Atome spécifique (La Loupe)
 */
export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  try {
    await connectToDatabase();
    
    // 🛡️ SUTURE : Passage de authOptions
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const caps = await getTaskCapabilities(userUid, params.taskId);
    if (!caps.includes(CAPABILITIES.TASK.READ) && !caps.includes('*')) {
        return NextResponse.json({ error: "L'accès à cet Atome t'est refusé." }, { status: 403 });
    }

    const task = await TaskModel.findOne({ uid: params.taskId }).lean();
    if (!task) return NextResponse.json({ error: "Atome non trouvé dans la silice." }, { status: 404 });

    // Hydratation : On renvoie l'Atome avec les capacités de l'Oiseau
    return NextResponse.json({ ...task, myCapabilities: caps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🚀 POST : Actions spécifiques sur un Atome (Création de sous-tâche / Sous-Atome Matrioshka)
 */
export async function POST(req: Request, { params }: { params: { taskId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const caps = await getTaskCapabilities(userUid, params.taskId);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Aura insuffisante pour agir sur cet Atome." }, { status: 403 });
    }

    const body = await req.json();
    const { action, data } = body;

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    const taskOrch = new TaskOrchestrator();

    if (action === 'CREATE_SUBTASK') {
      // Logique bionique de sous-atome rattaché à son Atome parent
      const newSubTask = await taskOrch.fosterTask({
        ...data,
        parentUid: params.taskId
      }, signature);
      return NextResponse.json(newSubTask, { status: 201 });
    }

    return NextResponse.json({ error: "Mouvement inconnu sur cet Atome." }, { status: 400 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

/**
 * 🛠️ PATCH : Mutation d'un Atome (Status, Pomodoros, etc.)
 */
export async function PATCH(req: Request, { params }: { params: { taskId: string } }) {
  try {
    await connectToDatabase(); // 🛡️ Réveil de la Silice
    
    // 🪡 SUTURE : Intégration de la boussole authOptions pour éclairer la session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const caps = await getTaskCapabilities(userUid, params.taskId);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
        return NextResponse.json({ error: "Tu ne peux pas faire muter cet Atome." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    const body = await req.json();
    const taskOrch = new TaskOrchestrator(); 

    const updatedTask = await taskOrch.updateTask(params.taskId, body, signature);
    return NextResponse.json(updatedTask);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

/**
 * 🗑️ DELETE : Désintégration d'un Atome (Le Silence)
 */
export async function DELETE(req: Request, { params }: { params: { taskId: string } }) {
  try {
    await connectToDatabase(); // 🛡️ Réveil de la Silice
    
    // 🪡 SUTURE : Intégration de la boussole authOptions pour éclairer la session
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const caps = await getTaskCapabilities(userUid, params.taskId);
    if (!caps.includes(CAPABILITIES.TASK.DELETE) && !caps.includes('*')) {
        return NextResponse.json({ error: "La désintégration de cet Atome requiert plus d'aura." }, { status: 403 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: caps
    };

    const taskOrch = new TaskOrchestrator(); 
    await taskOrch.disintegrateTask(params.taskId, signature);
    
    return NextResponse.json({ message: "Atome rendu à la poussière du Nexus." }, { status: 200 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}