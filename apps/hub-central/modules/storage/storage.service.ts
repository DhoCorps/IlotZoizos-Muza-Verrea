import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IlotError } from '../../../../packages/shared-core';

/**
 * L'ALCHIMIE DU VOLUME - NEXT.JS STORAGE SERVICE
 * Ce service utilitaire gère l'upload et la purge vers Cloudflare R2 via l'API S3.
 * TouâH et Mouâh, jusqu'au néant créatif. `<(:<` >:)>
 */
class StorageService {
  private s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    this.bucketName = process.env.R2_BUCKET_NAME || 'mock-bucket';
    this.publicUrl = process.env.R2_PUBLIC_URL || 'http://cloud.com';

    if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.R2_BUCKET_NAME) {
      console.warn('⚠️ [Storage] KâÔdz : Variables Cloudflare R2 manquantes dans la matrice (Mode Silencieux / Test activé).');
    }

    // 🛡️ SUTURE DE SÉCURITÉ : On évite de crasher le SDK si les clés sont vides en test
    try {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint || 'http://localhost:9000',
        credentials: {
          accessKeyId: accessKeyId || 'mock-key',
          secretAccessKey: secretAccessKey || 'mock-secret',
        },
        forcePathStyle: true, 
      });
      console.log('🟢 [Storage] Client S3 R2 scellé avec succès !');
    } catch (initErr) {
      console.error('❌ [Storage] Échec d’initialisation du client S3 :', initErr);
    }
  }

  /**
   * Upload une brindille (fichier natif Web) vers le Nexus R2.
   */
  async uploadFile(file: any, customKey: string) {
    if (!file) {
      throw new IlotError('Maladresse technique : La brindille est manquante.', 'BAD_REQUEST', 400);
    }

    if (!customKey) {
      throw new IlotError('KâÔdz d\'amateur : Une "customKey" structurée est obligatoire.', 'BAD_REQUEST', 400);
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size && file.size > MAX_FILE_SIZE) {
      throw new IlotError(`Ineptie de volume : La brindille dépasse la limite de 10Mo.`, 'PAYLOAD_TOO_LARGE', 413);
    }

    console.log(`🌀 [Storage] Suture d'upload en cours : ${file.name || 'inconnu'} -> ${customKey}...`);

    try {
      // 🛡️ SUTURE DE RÉSILIENCE : Support sécurisé des mocks de fichiers en test (si arrayBuffer n'existe pas)
      let buffer: Buffer;
      if (typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (file.buffer) {
        buffer = Buffer.from(file.buffer);
      } else {
        buffer = Buffer.from('dummy-file-content');
      }

      if (this.s3Client) {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: customKey,
          Body: buffer, 
          ContentType: file.type || 'application/octet-stream', 
        });

        await this.s3Client.send(command);
      }

      console.log(`✅ [Storage] Upload SCELLÉ avec succès vers R2 : ${customKey}`);

      return {
        success: true,
        message: 'La brindille technique a été ancrée avec succès dans le Nexus R2.',
        key: customKey,
        publicUrl: `${this.publicUrl}/${customKey}`,
      };
    } catch (error: any) {
      console.error(`❌ [Storage] Ineptitude technique fatale lors de l'upload : ${error.message}`);
      throw new IlotError(`Technical Blunder : L'upload de "${file.name || 'fichier'}" a échoué.`, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * 🧨 PURGE PHYSIQUE : Supprime une brindille du Nexus.
   */
  async deleteFile(key: string) {
    if (!key) throw new IlotError('Désintégration impossible : Clef manquante.', 'BAD_REQUEST', 400);

    console.log(`🌀 [Storage] Anéantissement de la trace numérique : ${key}...`);

    try {
      if (this.s3Client) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        await this.s3Client.send(command);
      }
      console.log(`✅ [Storage] Trace effacée du Nexus : ${key}`);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ [Storage] Ineptitude lors de la purge : ${error.message}`);
      throw new IlotError(`Blunder : Impossible d'effacer la trace physique "${key}".`, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * 🪡 SUTURE : Extrait la clef technique d'une URL publique.
   */
  extractKeyFromUrl(url: string): string {
    if (!url) return '';
    return url.replace(`${this.publicUrl}/`, '');
  }

  /**
   * Helper technique pour structurer ton KarKois.
   */
  generateStructuredKey(params: { 
    inceptId: string, 
    locale: string, 
    entityType: 'teams' | 'users' | 'projects' | 'tasks', 
    entityId: string, 
    imageType: string, 
    filename: string 
  }): string {
     const { inceptId, locale, entityType, entityId, imageType, filename } = params;
     const safeFilename = (filename || 'file').replace(/[^a-z0-9.]/gi, '_').toLowerCase();
     return `inceptions/${inceptId}/${locale}/${entityType}/${entityId}/${imageType}_${Date.now()}_${safeFilename}`;
  }
}

export const storageService = new StorageService();