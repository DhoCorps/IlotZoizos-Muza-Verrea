import crypto from 'crypto';

export class IPTracker {
    /**
     * Extrait l'IP réelle de l'Oiseau à travers les proxys (Railway / Cloudflare)
     */
    public static getClientIp(reqHeaders?: Headers | { get: (key: string) => string | null }): string {
        if (!reqHeaders) return '127.0.0.1';
        
        const forwardedFor = reqHeaders.get('x-forwarded-for');
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        return reqHeaders.get('x-real-ip') || '127.0.0.1';
    }

    /**
     * Génère une empreinte unique (Fingerprint) basée sur l'IP et les métadonnées du client
     */
    public static generateFingerprint(reqHeaders?: Headers | { get: (key: string) => string | null }): string {
        const ip = this.getClientIp(reqHeaders);
        const userAgent = reqHeaders?.get('user-agent') || 'unknown-browser';
        const acceptLanguage = reqHeaders?.get('accept-language') || 'fr';

        const rawString = `${ip}-${userAgent}-${acceptLanguage}`;
        return crypto.createHash('sha256').update(rawString).digest('hex');
    }
}