// packages/shared-core/src/sync-engine/consciousness.salon.orchestrator.ts
import * as crypto from 'crypto';
import { IlotError } from '../errors/ilot.errors';

export interface EnactedThought {
    ciphertext: string;
    iv: string;
    tag: string;
    timestamp: number;
}

export class ConsciousnessSalonOrchestrator {
    private static readonly ALGORITHM = 'aes-256-gcm';

    /**
     * Calcule le niveau d'intrication quantique de la conscience partagée (C = S ⊗ B)
     */
    public static calculateEntanglementLevel(resonanceScore: number, mutualTrustIndex: number): number {
        const entanglement = resonanceScore * mutualTrustIndex;
        return Number(entanglement.toFixed(3));
    }

    /**
     * Scelle une pensée (Chiffrement E2EE de bout en bout) pour le Salon Privé (Si)
     */
    public static sealThought(plainThought: string, sharedSecretKey: string): EnactedThought {
        if (!plainThought || !sharedSecretKey) {
            throw new IlotError("Matière ou clé manquante pour le scellement quantique.", "BAD_REQUEST", 400);
        }

        const iv = crypto.randomBytes(12);
        // Utilisation d'un hash SHA-256 pour garantir une clé de 32 octets requise par l'AES-256
        const key = crypto.createHash('sha256').update(String(sharedSecretKey)).digest();
        
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
        let ciphertext = cipher.update(plainThought, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');

        return {
            ciphertext,
            iv: iv.toString('hex'),
            tag,
            timestamp: Date.now()
        };
    }

    /**
     * Dés-enchâsse une pensée chiffrée dans l'intimité du Salon Privé
     */
    public static unsealThought(enacted: EnactedThought, sharedSecretKey: string): string {
        try {
            const key = crypto.createHash('sha256').update(String(sharedSecretKey)).digest();
            const decipher = crypto.createDecipheriv(
                this.ALGORITHM, 
                key, 
                Buffer.from(enacted.iv, 'hex')
            );
            
            decipher.setAuthTag(Buffer.from(enacted.tag, 'hex'));
            let decrypted = decipher.update(enacted.ciphertext, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // 🛡️ SUTURE : On intercepte les erreurs cryptographiques brutes (Bad key, tampered data)
            // pour renvoyer un rejet d'Aura propre plutôt qu'un crash serveur.
            throw new IlotError("Échec du dés-enchâssement : Clé invalide ou pensée altérée par l'abîme.", "FORBIDDEN", 403);
        }
    }
}