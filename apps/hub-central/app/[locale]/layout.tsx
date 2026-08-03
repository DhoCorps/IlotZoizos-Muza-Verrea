// apps/hub-central/app/[locale]/layout.tsx
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '../AuthProvider'; // 👈 Le pont d'identité
import { LetrinFontProvider } from '../../components/letrin/LetrinFontContext'; // 👈 Le fournisseur de polices Letr'In
import { UniversalGraphExplorer } from '../../components/graph/UniversalGraphExplorer'; // 👈 Le Navigateur Stellaire Global

import '../globals.css';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-[#05070A] text-slate-200 antialiased min-h-screen flex flex-col selection:bg-[#E5484D]/30 selection:text-white">
        
        {/* 🛰️ LE CŒUR DU NEXUS : Maintient la session de l'oiseau active partout */}
        <AuthProvider>
          
          {/* 🌐 LA MATRICE LINGUISTIQUE : Assure la traduction dans tout l'Îlot */}
          <NextIntlClientProvider locale={locale} messages={messages}>
            
            {/* 🔠 LA FORGE TYPOGRAPHIQUE LETR'IN : Injecte le contexte global des polices */}
            <LetrinFontProvider>
              {children}

              {/* 🌌 LE NAVIGATEUR STELLAIRE PERMANENT : Flotte en bas à droite pour explorer le graphe en tout temps */}
              <UniversalGraphExplorer />
            </LetrinFontProvider>

          </NextIntlClientProvider>
          
        </AuthProvider>
      </body>
    </html>
  );
}