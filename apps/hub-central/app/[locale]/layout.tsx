import React from 'react';
import { getTranslations } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';
import type { Metadata } from 'next';
import { CSPostHogProvider } from '@/components/providers/PostHogProvider';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: 'Le Nexus des Jeux | L\'Îlot Zoizos',
    description: 'Rejoignez les instances et affrontez d\'autres oiseaux dans la Matrice.',
    // Sentry injecte ses données de traçage ici
    other: {
      ...Sentry.getTraceData(),
    }
  };
}

export default function GamesLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      <body>
        <CSPostHogProvider>
          <div className="relative min-h-screen bg-[#05070A] overflow-hidden">
            {/* Effet visuel de fond : Nébuleuse subtile pour l'immersion (tons gris bleuté et violet) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-slate-900/10 blur-[120px]"></div>
              <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-900/10 blur-[120px]"></div>
            </div>

            {/* Conteneur principal qui accueille le Nexus */}
            <main className="relative z-10 w-full h-full">
              {children}
            </main>
          </div>
        </CSPostHogProvider>
      </body>
    </html>
  );
}