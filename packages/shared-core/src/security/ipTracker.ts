import { headers } from 'next/headers';
import crypto from 'crypto';

export class IPTracker {
    /**
     * Extrait l'IP réelle de l'Oiseau à travers les proxys (Railway / Cloudflare)
     */
    public static getClientIp(reqHeaders?: Headers): string {
        const heads = reqHeaders || headers();
        const forwardedFor = heads.get('x-forwarded-for');
        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        return heads.get('x-real-ip') || '127.0.0.1';
    }

    /**
     * Génère une empreinte unique (Fingerprint) basée sur l'IP et les métadonnées du client
     */
    public static generateFingerprint(reqHeaders?: Headers): string {
        const heads = reqHeaders || headers();
        const ip = this.getClientIp(heads);
        const userAgent = heads.get('user-agent') || 'unknown-browser';
        const acceptLanguage = heads.get('accept-language') || 'fr';

        const rawString = `${ip}-${userAgent}-${acceptLanguage}`;
        return crypto.createHash('sha256').update(rawString).digest('hex');
    }
}