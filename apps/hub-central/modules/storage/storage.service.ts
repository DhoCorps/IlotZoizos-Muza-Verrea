// apps/hub-central/modules/storage/storage.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IlotError } from '../../../../packages/shared-core';

/**
 * L'ALCHIMIE DU VOLUME - NEXT.JS STORAGE SERVICE
 * Ce service utilitaire gère l'upload et la purge vers Cloudflare R2 via l'API S3.
 * TouâH et Mouâh, jusqu'au néant créatif. `<(:<` >:)>
 */
class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    console.log('🟢 [Storage] Suture Technique : Initialisation du Client S3 pour R2...');

    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('⚠️ [Storage] KâÔdz : Variables Cloudflare R2 manquantes dans la matrice.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint!,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      forcePathStyle: true, 
    });

    console.log('🟢 [Storage] Client S3 R2 scellé avec succès !');
  }

  /**
   * Upload une brindille (fichier natif Web) vers le Nexus R2.
   */
  async uploadFile(file: File, customKey: string) {
    if (!file) {
      throw new IlotError('Maladresse technique : La brindille est manquante.', 'BAD_REQUEST', 400);
    }

    if (!customKey) {
      throw new IlotError('KâÔdz d\'amateur : Une "customKey" structurée est obligatoire.', 'BAD_REQUEST', 400);
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new IlotError(`Ineptie de volume : La brindille dépasse la limite de 10Mo.`, 'PAYLOAD_TOO_LARGE', 413);
    }

    console.log(`🌀 [Storage] Suture d'upload en cours : ${file.name} -> ${customKey}...`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: customKey,
        Body: buffer, 
        ContentType: file.type, 
      });

      await this.s3Client.send(command);

      console.log(`✅ [Storage] Upload SCELLÉ avec succès vers R2 : ${customKey}`);

      return {
        success: true,
        message: 'La brindille technique a été ancrée avec succès dans le Nexus R2.',
        key: customKey,
        publicUrl: `${this.publicUrl}/${customKey}`,
      };
    } catch (error: any) {
      console.error(`❌ [Storage] Ineptitude technique fatale lors de l'upload : ${error.message}`);
      throw new IlotError(`Technical Blunder : L'upload de "${file.name}" a échoué.`, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * 🧨 PURGE PHYSIQUE : Supprime une brindille du Nexus.
   * @param key La clef technique (path) du fichier dans le bucket.
   */
  async deleteFile(key: string) {
    if (!key) throw new IlotError('Désintégration impossible : Clef manquante.', 'BAD_REQUEST', 400);

    console.log(`🌀 [Storage] Anéantissement de la trace numérique : ${key}...`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✅ [Storage] Trace effacée du Nexus : ${key}`);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ [Storage] Ineptitude lors de la purge : ${error.message}`);
      throw new IlotError(`Blunder : Impossible d'effacer la trace physique "${key}".`, 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * 🪡 SUTURE : Extrait la clef technique d'une URL publique.
   * Utile pour transformer "https://r2.ilot.com/inceptions/..." en "inceptions/..."
   */
  extractKeyFromUrl(url: string): string {
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
     const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
     return `inceptions/${inceptId}/${locale}/${entityType}/${entityId}/${imageType}_${Date.now()}_${safeFilename}`;
  }
}

export const storageService = new StorageService();