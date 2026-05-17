import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-gray-300 font-mono">
      <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur-md border border-gray-800 rounded-lg shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-white/90">LE BORDEL DE DHÖ</h1>
          <p className="text-sm text-gray-500 mt-2 italic">L'onde est la seule vérité.</p>
        </div>
        {children}
      </div>
    </div>
  );
}