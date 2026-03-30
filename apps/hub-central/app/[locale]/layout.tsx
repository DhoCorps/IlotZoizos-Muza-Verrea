import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '../AuthProvider'; // 👈 On importe le pont
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
      <body className="bg-[#05070A] text-slate-200 antialiased">
        {/* 🛰️ On branche le Nexus ICI, tout en haut de la pile */}
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}