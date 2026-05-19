import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IlotError } from '../../../../packages/shared-core'
/**
 * L'ALCHIMIE DU VOLUME - NEXT.JS STORAGE SERVICE
 * Ce service utilitaire gère l'upload vers Cloudflare R2 via l'API S3.
 * TouâH et Mouâh, jusqu'au néant créatif. `<(:<` >:)>
 */
class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    console.log('🟢 [Storage] Suture Technique : Initialisation du Client S3 pour R2...');

    // Extraction des données Matrixielles depuis le `.env.local`
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('⚠️ [Storage] KâÔdz : Variables Cloudflare R2 manquantes dans la matrice.');
    }

    // Configuration du client S3 technique pour R2
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
   * @param file Le fichier issu de req.formData() (Son, Image, PDF...).
   * @param customKey La clef structurée (Key/Path) finale dans R2.
   */
  async uploadFile(file: File, customKey: string) {
    if (!file) {
      throw new IlotError('Maladresse technique : La brindille est manquante.', 'BAD_REQUEST', 400);
    }

    if (!customKey) {
      throw new IlotError('KâÔdz d\'amateur : Une "customKey" structurée est obligatoire.', 'BAD_REQUEST', 400);
    }

    // 🛡️ BOUCLIER ANTI-CRASH (Exemple: limite à 10 Mo)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes
    if (file.size > MAX_FILE_SIZE) {
      throw new IlotError(`Ineptie de volume : La brindille dépasse la limite de 10Mo.`, 'PAYLOAD_TOO_LARGE', 413);
    }

    console.log(`🌀 [Storage] Suture d'upload en cours : ${file.name} -> ${customKey}...`);

    try {
      // Transformation native Next.js : File -> Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Préparation de la commande technique S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: customKey,
        Body: buffer, 
        ContentType: file.type, 
      });

      // Lancement de l'upload vers Cloudflare R2
      await this.s3Client.send(command);

      console.log(`✅ [Storage] Upload SCELLÉ avec succès vers R2 : ${customKey}`);

      const publicFilePath = `${this.publicUrl}/${customKey}`;

      return {
        success: true,
        message: 'La brindille technique a été ancrée avec succès dans le Nexus R2.',
        key: customKey,
        publicUrl: publicFilePath,
      };

    } catch (error: any) {
      console.error(`❌ [Storage] Ineptitude technique fatale lors de l'upload vers R2 : ${error.message}`);
      throw new IlotError(`Technical Blunder : L'upload de "${file.name}" a échoué.`, 'INTERNAL_SERVER_ERROR', 500);
    }
  }
  /**
   * Helper technique pour structurer ton KarKois et anticiper l'option multilingue.
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
     
     // Cleanup du filename pour la Silice pure
     const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
     
     // L'arborescence technique multilingue et structurée
     return `inceptions/${inceptId}/${locale}/${entityType}/${entityId}/${imageType}_${Date.now()}_${safeFilename}`;
  }
}

// On exporte une instance unique (Singleton) pour éviter de rouvrir le client S3 à chaque appel
export const storageService = new StorageService();