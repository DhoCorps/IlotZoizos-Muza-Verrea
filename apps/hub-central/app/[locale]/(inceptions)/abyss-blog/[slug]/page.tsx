import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { UniversalCommentDrawer } from '@/components/global/UniversalCommentDrawer';
import { UniversalCommentModel, SujetModel, connectToDatabase } from '@ilot/infrastructure';
import AbyssBlogClientView from './AbyssBlogClientView';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 🔍 (SEO) Génération des métadonnées dynamiques
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const sujet = await SujetModel.findOne({ slug }).lean() as any;

  if (!sujet) return { title: 'Monologue introuvable | Îlot Zoizos' };

  return {
    title: sujet.seo?.metaTitle || `${sujet.title} | AbyssBlog`,
    description: sujet.seo?.metaDescription || sujet.excerpt || sujet.content.substring(0, 150),
    openGraph: {
      title: sujet.seo?.metaTitle || sujet.title,
      description: sujet.seo?.metaDescription || sujet.excerpt,
      images: sujet.media?.coverImageUrl ? [{ url: sujet.media.coverImageUrl }] : []
    }
  };
}

export default async function AbyssBlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  await connectToDatabase();

  // 1. Fetching du sujet par son slug côté serveur
  const sujetDoc = await SujetModel.findOne({ slug }).lean() as any;
  if (!sujetDoc) {
    notFound();
  }

  // Sérialisation propre pour passer au composant client
  const sujet = JSON.parse(JSON.stringify(sujetDoc));

  // 2. Fetching SSR des 10 commentaires les plus pertinents liés à ce sujet pour le SEO
  const initialCommentsDoc = await UniversalCommentModel.find({ targetUid: sujet.uid, isHidden: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const initialComments = JSON.parse(JSON.stringify(initialCommentsDoc));

  return (
    <>
      {/* 4. (SEO) Balises sémantiques cachées pour Googlebot (Contenu textuel indexable instantanément) */}
      <div className="sr-only" aria-hidden="true">
        <h2>Échos et résonances indexées pour {sujet.title}</h2>
        <ul>
          {initialComments.map((comment: any) => (
            <li key={comment.uid || comment._id}>
              <span>{comment.authorUid} :</span>
              <p>{comment.content}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Vue interactive Client intégrant l'intégralité du code et du design d'origine */}
      <AbyssBlogClientView sujet={sujet} initialComments={initialComments} />

      {/* Le Tiroir Global des Résonances (Zustand) */}
      <UniversalCommentDrawer />
    </>
  );
}