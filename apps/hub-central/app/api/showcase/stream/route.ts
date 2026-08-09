// apps/hub-central/app/api/showcase/stream/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { ShowcaseOrchestrator } from '@ilot/shared-core'; // Ajuste le chemin selon ton architecture
import { UniversalMediaType } from '@ilot/types'; // 👈 Import du type

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Identification de l'oiseau
    const userUid = searchParams.get('userUid'); 

    if (!userUid) {
      return NextResponse.json(
        { success: false, error: "Aura non détectée. L'oiseau doit être identifié pour invoquer le Diaporama." },
        { status: 401 }
      );
    }

    // Extraction et CASTING des filtres granulaires depuis l'URL 👇
    const appsParam = searchParams.get('apps');
    const selectedApps = appsParam ? (appsParam.split(',') as UniversalMediaType[]) : [];
    const onlyTradable = searchParams.get('onlyTradable') === 'true';

    const filters = {
      selectedApps,
      onlyTradable
    };

    // 🎬 Tissage du flux personnalisé via notre orchestrateur
    const playlist = await ShowcaseOrchestrator.getPersonalizedShowcase(userUid, filters);

    return NextResponse.json({
      success: true,
      data: playlist,
      count: playlist.length
    }, { status: 200 });

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne lors du tissage du flux." },
      { status: statusCode }
    );
  }
}