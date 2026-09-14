import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimiterForTesting } from '../security/rateLimiter';

// 🪡 Déclaration explicite des fonctions simulées
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(true);
const mockOn = vi.fn().mockReturnThis();

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: mockConnect,
    on: mockOn,
    incr: mockIncr,
    expire: mockExpire,
  })),
}));

describe('RateLimiter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiterForTesting();
  });

  it('devrait autoriser la requête et décrémenter le quota restant si la limite n’est pas atteinte', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockExpire.mockResolvedValueOnce(1);

    const result = await checkRateLimit('client-ip-1', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(mockIncr).toHaveBeenCalledWith('ratelimit:client-ip-1');
    expect(mockExpire).toHaveBeenCalledWith('ratelimit:client-ip-1', 60);
  });

  it('devrait bloquer la requête (allowed: false) si la limite est dépassée', async () =>{
    mockIncr.mockResolvedValueOnce(6);

    const result = await checkRateLimit('client-ip-2', 5, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('devrait appliquer le principe de résilience (autoriser par défaut) en cas de panne de Redis', async () => {
    mockIncr.mockRejectedValueOnce(new Error('Redis connection lost'));

    const result = await checkRateLimit('client-ip-fail', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('devrait autoriser directement si aucun identifiant n’est fourni', async () => {
    const result = await checkRateLimit('', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(mockIncr).not.toHaveBeenCalled();
  });
});