// Fichier : lib/cache/messages.cache.ts
import { unstable_cache } from 'next/cache';
import { MessageModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Récupération des messages d'un salon (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedMessages(conversationSlug: string, limit: number, before?: string | null) {
  const fetcher = async () => {
    const query: Record<string, unknown> = { conversationSlug };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return messages.reverse();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`messages-${conversationSlug}-${limit}-${before || 'latest'}`],
    { revalidate: 15, tags: ['messages', `conversation-${conversationSlug}`] }
  )();
}

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Comptage des messages non lus par utilisateur (avec bypass en test)
// -------------------------------------------------------------------------
export async function getCachedUnreadCount(userSlug: string) {
  const fetcher = async () => {
    return await MessageModel.countDocuments({
      senderSlug: { $ne: userSlug },
      "readBy.userSlug": { $ne: userSlug }
    });
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`unread-count-${userSlug}`],
    { revalidate: 10, tags: ['messages', `unread-${userSlug}`] }
  )();
}