'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400/80 bg-slate-900/40 border border-red-900/30 rounded-xl hover:bg-red-950/50 hover:text-red-300 hover:border-red-500/50 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md group"
    >
      <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
      <span>Quitter le nid</span>
    </button>
  );
}