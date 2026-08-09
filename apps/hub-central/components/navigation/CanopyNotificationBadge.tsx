'use client';

import React from 'react';
import { useUnreadMessages } from '../../hooks/useUnreadMessage';

export function CanopyNotificationBadge() {
  const unreadCount = useUnreadMessages();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(220,38,38,0.6)] animate-pulse ring-2 ring-slate-950">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}