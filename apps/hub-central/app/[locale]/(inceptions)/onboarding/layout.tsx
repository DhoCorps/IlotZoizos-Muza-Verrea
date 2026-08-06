import React from 'react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden">
      {children}
    </div>
  );
}