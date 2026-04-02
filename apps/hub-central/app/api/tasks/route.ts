import { NextResponse } from 'next/server';
import { TaskOrchestrator } from '../../../../../packages/shared-core';
import { TaskModel } from '../../../../../packages/infrastructure';

/**
 * 📂 GET : Récupérer les tâches
 * Supporte le filtrage par projectUid ou assigneeUid via query params
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectUid = searchParams.get('projectUid');
    const assigneeUid = searchParams.get('assigneeUid');

    let query: any = {};
    if (projectUid) query.projectUid = projectUid;
    if (assigneeUid) query.assigneeUids = assigneeUid;

    const tasks = await TaskModel.find(query).sort({ 'dates.updatedAt': -1 });
    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🐣 POST : Fondation d'une tâche (Tom-hat-Toes)
 * Attend au minimum 'projectUid', 'creatorUid' et 'content.title'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Appel à l'orchestrateur pour la double-suture (Mongo + Neo4j)
    const newTask = await TaskOrchestrator.fosterTask(body);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}