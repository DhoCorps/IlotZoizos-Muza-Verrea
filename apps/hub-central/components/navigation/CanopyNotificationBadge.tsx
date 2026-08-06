// apps/hub-central/components/navigation/CanopyNotificationBadge.tsx
'use client';

import React from 'react';
import { useUnreadMessages } from '../../hooks/useUnreadMessage';

export function CanopyNotificationBadge() {
  const unreadCount = useUnreadMessages();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-lg animate-pulse ring-2 ring-zinc-950">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}