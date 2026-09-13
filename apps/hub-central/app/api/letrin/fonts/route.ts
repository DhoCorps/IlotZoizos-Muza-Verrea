export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FontProject } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontProjects } from '@/lib/cache/letrin.cache';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité

export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const projects = await getCachedFontProjects();
    // Sérialisation propre pour éviter les erreurs de type non sérialisable en test/runtime
    const safeProjects = JSON.parse(JSON.stringify(projects || []));
    return NextResponse.json({ success: true, data: safeProjects }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité sur la structure canonique du projet
    const canonicalContent = JSON.stringify({
      name: body.name || 'Projet de Police Sans Nom',
      authorUid: currentUser.uid || 'unknown',
      payload: body.data || body
    });

    const contentBuffer = Buffer.from(canonicalContent, 'utf-8');
    const digitalSignature = generateFileHash(contentBuffer);
    const timestampedAt = new Date();

    const projectPayload = {
      ...body,
      authorUid: currentUser.uid,
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newProject;
    try {
      newProject = await FontProject.create(projectPayload);
    } catch (createErr) {
      console.error("  [LETRIN FONTS CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation du projet." }, { status: 500 });
    }

    revalidateTag('fonts');
    revalidateTag('font-projects');

    return NextResponse.json({ 
      success: true, 
      data: newProject,
      digitalSignature,
      timestampedAt
    }, { status: 201 });

  } catch (error: any) {
    console.error("  Erreur globale POST Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});