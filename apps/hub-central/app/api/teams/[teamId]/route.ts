// apps/hub-central/app/api/teams/[teamId]/route.ts

import { NextResponse } from 'next/server';
import { TeamOrchestrator } from "../../../../../../packages/shared-core";

// 🏗️ ÉDITION DU NID (Mutation de structure)
export async function PUT(req: Request, { params }: { params: { teamId: string } }) {
  try {
    const body = await req.json();
    
    // Chirurgie : On délègue tout à l'orchestrateur pour la double-suture
    const updatedTeam = await TeamOrchestrator.mutateTeam(params.teamId, body);

    return NextResponse.json(updatedTeam);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🧨 DISSOLUTION DU NID (Effacement du Graphe et de la Silice)
export async function DELETE(req: Request, { params }: { params: { teamId: string } }) {
  try {
    // Chirurgie : L'orchestrateur gère maintenant le TransactionManager
    await TeamOrchestrator.dissolveTeam(params.teamId);

    return NextResponse.json({ 
      message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}