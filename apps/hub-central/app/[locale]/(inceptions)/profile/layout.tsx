import React from 'react';
import Sidebar from '../../../../components/navigation/Sidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 pl-20 md:pl-28 pr-4 py-8 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}