// apps/hub-central/app/[locale]/layout.tsx
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '../AuthProvider'; 

// 💬 IMPORTS DES COMMUNICATIONS
import { ChatProvider } from '../../context/ChatContext'; 
import { GlobalChatWidget } from '../../components/chat/GlobalChatWidget'; 

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
        
        {/* 🛰️ LE CŒUR DU NEXUS : Maintient la session active */}
        <AuthProvider>
          
          {/* 🌐 LA MATRICE LINGUISTIQUE : Assure la traduction */}
          <NextIntlClientProvider locale={locale} messages={messages}>
            
            {/* 💬 GESTIONNAIRE DE COMMUNICATIONS : Le contexte global du chat */}
            <ChatProvider>
              
              {/* Le contenu de la page s'affiche ici, sans interférences lourdes */}
              {children}

              {/* 📡 LE TERMINAL : Le widget de chat qui flotte au-dessus de tout */}
              <GlobalChatWidget />

            </ChatProvider>

          </NextIntlClientProvider>
          
        </AuthProvider>
      </body>
    </html>
  );
}