// apps/hub-central/modules/security/rateLimiter.ts
import { createClient } from 'redis';

const REDIS_URI = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://127.0.0.1:6379';

// Client Redis singleton pour le Rate Limiting
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    console.log(`[RateLimiter] 🚀 Initialisation du client Redis sur : ${REDIS_URI}`);
    redisClient = createClient({ url: REDIS_URI });
    redisClient.on('error', (err) => console.error('[Redis RateLimiter Error]', err.message));
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * 🛡️ CONTRÔLE DE DÉBIT (Rate Limiter)
 * Vérifie si une IP ou un identifiant dépasse le nombre maximal de requêtes autorisées dans une fenêtre de temps.
 * @param identifier Identifiant unique (ex: Adresse IP ou UID de l'Oiseau)
 * @param limit Nombre max de requêtes autorisées
 * @param windowSeconds Fenêtre de temps en secondes
 */
export async function checkRateLimit(identifier: string, limit = 10, windowSeconds = 60): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const client = await getRedisClient();
    const key = `ratelimit:${identifier}`;

    // Incrémente le compteur de requêtes pour cet identifiant
    const currentCount = await client.incr(key);

    // Si c'est la première requête de la fenêtre, on initialise l'expiration
    if (currentCount === 1) {
      await client.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - currentCount);
    
    if (currentCount > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining };
  } catch (error) {
    // En cas de panne de Redis, on autorise par défaut pour ne pas bloquer les utilisateurs (Principe de résilience)
    console.error('⚠️ [RateLimiter] Erreur Redis, contournement de sécurité temporaire :', error);
    return { allowed: true, remaining: 99 };
  }
}