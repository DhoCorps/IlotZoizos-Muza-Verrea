export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { CVTemplateModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedTemplates } from '@/lib/cache/kontakt.cache';

export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const authorUid = url.searchParams.get('authorUid');
    const templates = await getCachedTemplates(authorUid);
    return NextResponse.json({ success: true, data: templates }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur GET Templates CV :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    const userUid = currentUser.uid;
    const userName = (currentUser as any).name || 'Oiseau Inconnu';
    const templateUid = `tmpl_${uuidv4()}`;
    let newTemplate;
    try {
      newTemplate = await CVTemplateModel.create({
        uid: templateUid,
        authorUid: userUid,
        authorName: userName,
        title: body.title || 'Parchemin Sans Nom',
        description: body.description || 'Modèle forgé dans la matrice.',
        priceShards: body.priceShards || 0,
        barterAccepted: body.barterAccepted ?? true,
        letrinFontFamily: body.letrinFontFamily || 'sans',
        blocks: body.blocks || []
      });
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
  } catch (error: any) {
    console.error("  Erreur POST Template CV :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});