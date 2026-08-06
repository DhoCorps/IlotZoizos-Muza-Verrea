// apps/hub-central/hooks/useUnreadMessages.ts
'use client';

import { useState, useEffect } from 'react';

export function useUnreadMessages(pollIntervalMs = 12000) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkUnread() {
      try {
        const res = await fetch('/api/messages/unread');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(data.unreadCount || 0);
          }
        }
      } catch (err) {
        // Silencieux en arrière-plan pour ne pas perturber l'expérience
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return unreadCount;
}