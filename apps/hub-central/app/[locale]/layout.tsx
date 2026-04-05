import type { Metadata } from 'next';
import { NextAuthProvider } from '../../components/providers/NextAuthProvider';
import '../globals.css';

export const metadata: Metadata = {
  title: 'IlotZoizos-Muza-Verrea Hub-Central',
  description: 'La dimension où ton désir est Forever grounded.',
};

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      <body className="font-sans antialiased text-white bg-black/90">
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}