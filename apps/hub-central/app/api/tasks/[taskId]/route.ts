import { NextResponse } from 'next/server';
import { TaskOrchestrator } from '../../../../../../packages/shared-core';
import { TaskModel } from '../../../../../../packages/infrastructure';

/**
 * 🔍 GET : Récupérer un Atome spécifique
 */
export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const task = await TaskModel.findOne({ uid: params.taskId });
    if (!task) return NextResponse.json({ error: "Atome non trouvé" }, { status: 404 });
    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🛠️ PATCH : Mise à jour d'un Atome (Status, Pomodoros, etc.)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const body = await req.json();
    // On passe par l'orchestrateur pour que Neo4j soit aussi au courant si besoin
    const updatedTask = await TaskOrchestrator.updateTask(params.taskId, body);
    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🗑️ DELETE : Désintégration d'un Atome
 */
export async function DELETE(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await TaskOrchestrator.disintegrateTask(params.taskId);
    return NextResponse.json({ message: "Atome désintégré avec succès" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}