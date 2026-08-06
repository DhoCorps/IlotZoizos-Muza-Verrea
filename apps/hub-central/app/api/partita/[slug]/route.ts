import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { authOptions } from "../../../../lib/auth"; // 🪡 Ajuste si besoin
import { ActionSignature, CAPABILITIES } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (err) {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de lecture de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    let partition;
    try {
      partition = await PartitaModel.findOne({ 
        $or: [{ slug: resolvedParams.slug }, { uid: resolvedParams.slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [PARTITA SLUG GET ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture de la partition." }, { status: 500 });
    }

    if (!partition) {
      return NextResponse.json({ error: "Cette partition s'est évaporée de la Silice." }, { status: 404 });
    }

    const isPublic = partition.status === 'PUBLISHED';
    const isMine = partition.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
        return NextResponse.json({ error: "Cette partition intime t'est fermée." }, { status: 403 });
    }

    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];
    return NextResponse.json({ ...partition, myCapabilities: myCaps }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Partita Slug :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    let body;
    try {
      resolvedParams = await params;
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Corps de requête ou paramètres illisibles." }, { status: 400 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    let updatedPartition;
    try {
      const partitaOrch = new PartitaOrchestrator();
      updatedPartition = await partitaOrch.updatePartita(resolvedParams.slug, body, signature);
    } catch (orchErr: any) {
      console.error("🔥 [PARTITA ORCHESTRATOR PUT ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de mutation." }, { status });
    }

    return NextResponse.json(updatedPartition, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Partita :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });

    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const signature: ActionSignature = {
        actorUid: userUid,
        capabilities: sessionCaps
    };

    try {
      const partitaOrch = new PartitaOrchestrator();
      await partitaOrch.disintegratePartita(resolvedParams.slug, signature);
    } catch (orchErr: any) {
      console.error("🔥 [PARTITA ORCHESTRATOR DELETE ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de dissolution." }, { status });
    }
    
    return NextResponse.json({ message: "La partition a été réduite en cendres." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Partita :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}