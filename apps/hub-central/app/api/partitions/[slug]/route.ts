import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { authOptions } from "../../../../lib/auth"; // Ajuste le chemin selon ton dossier API
import { ActionSignature, CAPABILITIES } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une partition par son slug
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    // Recherche par slug ou repli sur uid
    const partition = await PartitaModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    }).lean();

    if (!partition) return NextResponse.json({ error: "Cette partition s'est évaporée de la Silice." }, { status: 404 });

    const isPublic = partition.status === 'PUBLISHED';
    const isMine = partition.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
        return NextResponse.json({ error: "Cette partition intime t'est fermée." }, { status: 403 });
    }

    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];

    return NextResponse.json({ ...partition, myCapabilities: myCaps }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT : Mutation de la Partition
// ==========================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const body = await req.json();
    const partitaOrch = new PartitaOrchestrator();
    const updatedPartition = await partitaOrch.updatePartita(slug, body, signature);

    return NextResponse.json(updatedPartition);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

// ==========================================
// DELETE : Désintégration (Brûler la partition)
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    const partitaOrch = new PartitaOrchestrator();
    await partitaOrch.disintegratePartita(slug, signature);
    
    return NextResponse.json({ message: "La partition a été réduite en cendres. Les liens dans le Graphe sont rompus." }, { status: 200 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}