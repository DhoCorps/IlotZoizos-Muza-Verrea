import React from 'react';
import { Metadata } from 'next';
import { LibraryBookModel } from '@ilot/infrastructure';
import { connectToDatabase } from '@ilot/infrastructure';
import { BibliotekClientView } from '@/components/bibliotek/BibliotekClientView';

// 🌐 Métadonnées SEO statiques pour la vitrine globale
export const metadata: Metadata = {
  title: "Bibliotek | L'Îlot Zoizos",
  description: "Le sanctuaire des écrits libres. Découvrez des œuvres protégées par Sceau SHA-256 et soutenez vos auteurs via la Canopée.",
};

export default async function BibliotekServerPage() {
  // 1. Connexion directe à la Silice pour le rendu Serveur (SSR)
  await connectToDatabase();

  // 2. Fetch de la première page d'ouvrages PUBLISHED (Le garde-fou est côté serveur)
  const limit = 9;
  const [initialBooks, total] = await Promise.all([
    LibraryBookModel.find({ status: 'PUBLISHED' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    LibraryBookModel.countDocuments({ status: 'PUBLISHED' })
  ]);

  // Sérialisation pour nettoyer les ObjectId de Mongoose avant de passer au Client
  const safeInitialBooks = JSON.parse(JSON.stringify(initialBooks || []));

  // 3. Rendu du composant client avec les données pré-chargées
  return (
    <BibliotekClientView 
      initialData={safeInitialBooks}
      initialTotal={total}
      initialLimit={limit}
    />
  );
}