import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from '../messaging/message.service';
import { MessageModel } from '@ilot/infrastructure';

// 🪡 Mock robuste du modèle Mongoose simulant une classe/constructeur avec .save()
vi.mock('@ilot/infrastructure', () => ({
  MessageModel: class {
    data: any;
    constructor(data: any) {
      this.data = data;
      Object.assign(this, data);
    }
    async save() {
      return this;
    }
  }
}));

describe('MessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait envoyer un message classique et l’enregistrer avec succès', async () => {
    const params = {
      conversationSlug: 'conv-canopy-1',
      senderSlug: 'oiseau_666',
      content: 'Salutations depuis la cime des arbres !'
    };

    const result = await MessageService.sendMessage(params);

    expect(result).toBeDefined();
    expect(result.slug).toMatch(/^msg_/);
    expect(result.conversationSlug).toBe('conv-canopy-1');
    expect(result.senderSlug).toBe('oiseau_666');
    expect(result.content).toBe('Salutations depuis la cime des arbres !');
    expect(result.isSystemBroadcast).toBe(false);
  });

  it('devrait rejeter l’envoi si des paramètres obligatoires manquent', async () => {
    const params = {
      conversationSlug: '',
      senderSlug: '',
      content: ''
    };

    await expect(MessageService.sendMessage(params)).rejects.toThrow(
      'Paramètres de message incomplets dans la matrice.'
    );
  });

  it('devrait diffuser la Newsletter de la Canopée avec formatage et métadonnées', async () => {
    const params = {
      targetAudience: 'all-birds',
      subject: 'Bilan Trimestriel',
      content: 'Les réserves de graines sont au beau fixe.',
      statsSnapshot: { seedsCollected: 1450, activeNests: 12 }
    };

    const result = await MessageService.sendSystemNewsletter(params);

    expect(result).toBeDefined();
    expect(result.slug).toMatch(/^broadcast_/);
    expect(result.conversationSlug).toBe('canopy-newsletter');
    expect(result.senderSlug).toBe('SYSTEM_CANOPY_ROOT');
    expect(result.content).toBe('### Bilan Trimestriel\n\nLes réserves de graines sont au beau fixe.');
    expect(result.isSystemBroadcast).toBe(true);
    expect(result.metadata).toMatchObject({
      targetAudience: 'all-birds',
      statsSnapshot: { seedsCollected: 1450, activeNests: 12 }
    });
  });

  it('devrait rejeter la newsletter si le sujet ou le contenu manquent', async () => {
    const params = {
      targetAudience: 'all-birds',
      subject: '',
      content: '',
      statsSnapshot: {}
    };

    await expect(MessageService.sendSystemNewsletter(params)).rejects.toThrow(
      'Sujet ou contenu de la newsletter manquant.'
    );
  });
});