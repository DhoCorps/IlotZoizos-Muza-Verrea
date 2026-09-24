export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { CVTemplateModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedTemplates } from '@/lib/cache/kontakt.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider la création d'un modèle de CV
const CreateCVTemplateSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  description: z.string().optional(),
  priceShards: z.number().min(0).optional(),
  barterAccepted: z.boolean().optional(),
  letrinFontFamily: z.string().optional(),
  blocks: z.array(z.unknown()).optional(),
});

type CreateCVTemplateInput = z.infer<typeof CreateCVTemplateSchema>;

interface CVTemplateDocument {
  uid: string;
  authorUid: string;
  title: string;
  [key: string]: unknown;
}

export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const authorUid = url.searchParams.get('authorUid');
    const templates = await getCachedTemplates(authorUid);
    return NextResponse.json({ success: true, data: templates }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATES GET ERROR');
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
    const validation = CreateCVTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de modèle de CV invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateCVTemplateInput = validation.data;

    const userUid = currentUser.uid;
    const userName = (currentUser as Record<string, unknown>).name as string || 'Oiseau Inconnu';
    const templateUid = `tmpl_${uuidv4()}`;

    let newTemplate: CVTemplateDocument;
    try {
      newTemplate = (await CVTemplateModel.create({
        ...sanitizedData,
        uid: templateUid,
        authorUid: userUid,
        authorName: userName,
        title: sanitizedData.title || 'Parchemin Sans Nom',
        description: sanitizedData.description || 'Modèle forgé dans la matrice.',
        priceShards: sanitizedData.priceShards || 0,
        barterAccepted: sanitizedData.barterAccepted ?? true,
        letrinFontFamily: sanitizedData.letrinFontFamily || 'sans',
        blocks: sanitizedData.blocks || []
      })) as unknown as CVTemplateDocument;
    } catch (createErr) {
      console.error("  [TEMPLATE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la sédimentation du modèle en base." }, { status: 500 });
    }

    revalidateTag('cv-templates');
    revalidateTag(`author-${userUid}`);

    return NextResponse.json({
      success: true,
      message: "Modèle de CV sédimenté et publié comme artefact.",
      data: newTemplate
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT TEMPLATES POST ERROR');
  }
});