'use client';
import Sidebar from "@/components/navigation/Sidebar";

export default function LetrinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0A0D14]">
      <Sidebar />
      <main className="pl-40 pr-8 py-8">
        {children}
      </main>
    </div>
  );
}