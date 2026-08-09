// apps/hub-central/app/api/showcase/preferences/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { IlotError } from '@ilot/shared-core';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerUid, sourceApp, consentForShowcase, consentForMusicSync } = body;

    if (!ownerUid) {
      return NextResponse.json(
        { success: false, error: "Identifiant d'oiseau (ownerUid) requis." }, 
        { status: 400 }
      );
    }

    // Mise à jour groupée ou par application source des consentements de l'oiseau dans le registre universel
    const filter: any = { ownerUid };
    if (sourceApp) {
      filter.sourceApp = sourceApp;
    }

    const updateData: any = {};
    if (typeof consentForShowcase === 'boolean') updateData.consentForShowcase = consentForShowcase;
    if (typeof consentForMusicSync === 'boolean') updateData.consentForMusicSync = consentForMusicSync;

    await UniversalMediaModel.updateMany(filter, { $set: updateData });

    return NextResponse.json({
      success: true,
      message: "Préférences de la canopée mises à jour avec succès.",
      ownerUid,
      updatedPreferences: updateData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne de la matrice." }, 
      { status: 500 }
    );
  }
}