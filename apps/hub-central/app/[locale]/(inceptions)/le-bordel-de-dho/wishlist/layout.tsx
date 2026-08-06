import React from 'react';
import Sidebar from '../../../../../components/navigation/Sidebar';

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      {/* Zone principale avec scrollbar personnalisée */}
      <main className="flex-1 pl-20 md:pl-28 h-full overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}