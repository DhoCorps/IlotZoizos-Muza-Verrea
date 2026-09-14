import { createClient } from 'redis';

const REDIS_URI = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://127.0.0.1:6379';

let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient) {
    console.log(`[RateLimiter] 🚀 Initialisation du client Redis sur : ${REDIS_URI}`);
    redisClient = createClient({ url: REDIS_URI });
    
    // Protection totale : si .on existe, on l'attache en toute sécurité
    if (redisClient && typeof redisClient.on === 'function') {
      redisClient.on('error', (err: any) => console.error('[Redis RateLimiter Error]', err?.message || err));
    }
    
    if (redisClient && typeof redisClient.connect === 'function') {
      await redisClient.connect();
    }
  }
  return redisClient;
}

export function resetRateLimiterForTesting() {
  redisClient = null;
}

export async function checkRateLimit(identifier: string, limit = 10, windowSeconds = 60): Promise<{ allowed: boolean; remaining: number }> {
  if (!identifier) {
    return { allowed: true, remaining: limit };
  }

  try {
    const client = await getRedisClient();
    if (!client || typeof client.incr !== 'function') {
      throw new Error('Client Redis invalide ou non initialisé.');
    }

    const key = `ratelimit:${identifier}`;
    const currentCount = await client.incr(key);

    if (currentCount === 1 && typeof client.expire === 'function') {
      await client.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - currentCount);
    
    if (currentCount > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining };
  } catch (error) {
    console.error('⚠️ [RateLimiter] Erreur Redis, contournement de sécurité temporaire :', error);
    return { allowed: true, remaining: 99 };
  }
}