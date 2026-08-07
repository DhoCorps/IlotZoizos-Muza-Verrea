import React from 'react';
import Sidebar from '@/components/navigation/Sidebar';

export default function TomHatToesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-[#05070A] overflow-hidden">
      <Sidebar />
      <main className="flex-1 pl-20 md:pl-28 h-full overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}