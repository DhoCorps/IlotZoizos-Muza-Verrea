// apps/hub-central/app/[locale]/(inceptions)/kontakt/layout.tsx
'use client';
import Sidebar from "../../../../components/navigation/Sidebar";

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0A0D14] text-white">
      <Sidebar />
      <main className="pl-40 pr-8 py-8">
        {children}
      </main>
    </div>
  );
}