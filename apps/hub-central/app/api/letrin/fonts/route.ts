export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FontProject } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedFontProjects } from '@/lib/cache/letrin.cache';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider la création d'un projet de police
const CreateFontProjectSchema = z.object({
  name: z.string().min(1, "Le nom du projet est requis.").optional(),
  payload: z.unknown().optional(),
  data: z.unknown().optional(),
  status: z.string().optional(),
});

type CreateFontProjectInput = z.infer<typeof CreateFontProjectSchema>;

interface FontProjectDocument {
  _id?: string;
  uid?: string;
  name: string;
  authorUid: string;
  digitalSignature?: string;
  timestampedAt?: Date;
  copyrightClaimed?: boolean;
  [key: string]: unknown;
}

export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const projects = await getCachedFontProjects();
    // Sérialisation propre pour éviter les erreurs de type non sérialisable en test/runtime
    const safeProjects = JSON.parse(JSON.stringify(projects || []));
    return NextResponse.json({ success: true, data: safeProjects }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN FONTS GET ERROR');
  }
});

export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement via Zod
    const validation = CreateFontProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de projet de police invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateFontProjectInput = validation.data;
    const rawBody = (body || {}) as Record<string, unknown>;

    const projectName = sanitizedData.name || 'Projet de Police Sans Nom';
    const authorUid = currentUser.uid || 'unknown';

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité sur la structure canonique du projet
    const canonicalContent = JSON.stringify({
      name: projectName,
      authorUid,
      payload: sanitizedData.data || sanitizedData.payload || rawBody
    });

    const contentBuffer = Buffer.from(canonicalContent, 'utf-8');
    const digitalSignature = generateFileHash(contentBuffer);
    const timestampedAt = new Date();

    const projectPayload = {
      ...rawBody,
      ...sanitizedData,
      name: projectName,
      authorUid,
      digitalSignature,
      timestampedAt,
      copyrightClaimed: true
    };

    let newProject: FontProjectDocument;
    try {
      newProject = (await FontProject.create(projectPayload)) as unknown as FontProjectDocument;
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

  } catch (error: unknown) {
    return handleRouteError(error, 'LETRIN FONTS POST ERROR');
  }
});