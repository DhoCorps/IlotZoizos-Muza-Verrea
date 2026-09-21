'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';

/**
 * 🎨 Correspondance des couleurs sémantiques de la Canopée
 */
const categoryColors: Record<string, string> = {
  TEXT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  AUDIO: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  VISUAL: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  SOCIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  SYSTEM: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  DIGEST: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const handleOpenToggle = () => {
    setIsOpen(!isOpen);
    // Si on ouvre et qu'il y a des non-lues, on peut déclencher l'apaisement
    if (!isOpen && unreadCount > 0) {
      const unreadUids = notifications
        .filter((n: any) => !n.isRead)
        .map((n: any) => n.uid);
      if (unreadUids.length > 0) {
        markAsRead(unreadUids);
      }
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* 🛎️ Le Bouton Cloche avec Pulsation des Flux */}
      <button
        onClick={handleOpenToggle}
        className="relative p-2 rounded-full hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Ouvrir le journal des notifications"
      >
        <svg
          className="w-6 h-6 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* 🌟 Indicateur de pulsation si non-lu */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 text-[9px] text-white items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* 📜 Le Journal / Digest déroulant */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">
              🌿 Journal de la Canopée
            </h3>
            <span className="text-xs text-slate-400">
              {notifications.length} écho{notifications.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                Le silence règne dans la canopée...
              </div>
            ) : (
              notifications.map((notif: any) => {
                const badgeColor = categoryColors[notif.category] || categoryColors.SYSTEM;
                
                return (
                  <div
                    key={notif.uid}
                    className={`p-4 transition-colors hover:bg-slate-800/50 ${
                      !notif.isRead ? 'bg-slate-800/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {notif.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        {notif.payload?.title && (
                          <h4 className="text-xs font-semibold text-slate-200 mb-1 truncate">
                            {notif.payload.title}
                          </h4>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.payload?.message}
                        </p>
                        
                        {notif.payload?.targetUrl && (
                          <Link
                            href={notif.payload.targetUrl}
                            onClick={() => setIsOpen(false)}
                            className="inline-block mt-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          >
                            Explorer l&apos;œuvre →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}