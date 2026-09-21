import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LibraryBookModel, findEntityBySlugOrUid, ILibraryBook } from '@ilot/infrastructure';
import { connectToDatabase } from '@ilot/infrastructure';
import { PapierAncreReader } from '@/components/bibliotek/PapierAncreReader';
import { ScholarlyNotesSection } from '@/components/bibliotek/ScholarlyNotesSection';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 🌐 1. Génération dynamique des balises SEO & OpenGraph côté serveur
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectToDatabase();
  const { slug } = await params;
  
  const book = await findEntityBySlugOrUid(LibraryBookModel, slug) as ILibraryBook | null;
  if (!book || book.status !== 'PUBLISHED') {
    return {
      title: "Ouvrage introuvable | Bibliotek",
      description: "Cet écrit s'est évaporé du Sanctuaire de l'Îlot."
    };
  }

  const metaTitle = book.seo?.metaTitle || `${book.title} — Bibliotek`;
  const metaDescription = book.seo?.metaDescription || `Découvrez l'œuvre "${book.title}" signée par l'Oiseau sur l'Îlot Zoizos. Protégé par Sceau SHA-256.`;
  const ogImage = book.seo?.ogImageUrl || book.coverUrl || 'https://ilot-zoizos.com/og-default.jpg';

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'book',
      url: `https://ilot-zoizos.com/bibliotek/${book.slug}`,
      images: [{ url: ogImage }],
      authors: [book.authorSlug || book.authorUid]
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [ogImage]
    }
  };
}

// 📖 2. Page Serveur (SSR) de lecture de l'ouvrage
export default async function BookDetailsPage({ params }: PageProps) {
  await connectToDatabase();
  const { slug } = await params;

  const book = await findEntityBySlugOrUid(LibraryBookModel, slug) as ILibraryBook | null;
  
  // Si le livre n'existe pas ou n'est pas publié, on lève une 404
  if (!book || book.status !== 'PUBLISHED') {
    notFound();
  }

  const serializedBook = JSON.parse(JSON.stringify(book));

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-12 animate-in fade-in duration-500">
      
      {/* Liseuse immersive "Papier Ancre" enrichie (Audio, Vibrations, Suivi & Troc) */}
      <PapierAncreReader book={serializedBook} />

      {/* Section dorée des Notes d'Érudits (Fulgurances validées par l'auteur) */}
      <ScholarlyNotesSection bookSlug={serializedBook.slug || serializedBook.uid} />

    </main>
  );
}