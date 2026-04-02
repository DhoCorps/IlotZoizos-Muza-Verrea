import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '../AuthProvider'; // 👈 Le pont d'identité
import '../globals.css';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      {/* 🌑 FONDATIONS DE LA MATRICE :
        Fond abyssal OLED, texte purifié (antialiased), hauteur minimale garantie, 
        et sélection de texte rouge organique (Bio-Tech).
      */}
      <body className="bg-[#05070A] text-slate-200 antialiased min-h-screen flex flex-col selection:bg-[#E5484D]/30 selection:text-white">
        
        {/* 🛰️ LE CŒUR DU NEXUS : Maintient la session de l'oiseau active partout */}
        <AuthProvider>
          
          {/* 🌐 LA MATRICE LINGUISTIQUE : Assure la traduction dans tout l'Îlot */}
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
          
        </AuthProvider>
      </body>
    </html>
  );
}