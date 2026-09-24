import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FloatingChapeau } from '@/components/chapeau/FloatingChapeau';
import React from 'react';

// 🎭 Mock du contexte Chapeau
vi.mock('@/context/ChapeauContext', () => ({
  useChapeau: () => ({
    chapeauData: {
      recipientUid: 'bird_vendeur_1',
      recipientPseudo: 'VendeurPro',
      targetTitle: 'Artefact Majestueux',
      storeUid: 'store_123'
    }
  })
}));

describe('UI Component : FloatingChapeau (Le Chapeau Contextuel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.alert = vi.fn(); // Mock de l'alerte native
  });

  it('🟢 doit afficher le bouton flottant principal avec les informations du destinataire', () => {
    render(<FloatingChapeau />);
    expect(screen.getByText('Le Chapeau')).toBeDefined();
    expect(screen.getByText('Pour VendeurPro')).toBeDefined();
  });

  it('🟢 doit ouvrir le menu contextuel au clic et proposer les options de soutien et de troc', () => {
    render(<FloatingChapeau />);
    
    // Clic pour ouvrir le chapeau
    fireEvent.click(screen.getByTitle('Ouvrir le Chapeau contextuel'));

    expect(screen.getByText(/Artefact Majestueux/)).toBeDefined();
    // Correction : "Soutenir (€)" au lieu de "Soutien (€)"
    expect(screen.getByText(/Soutenir \(€\)/)).toBeDefined();
    expect(screen.getByText(/Troc \(📦\)/)).toBeDefined();
  });

  it('🟢 doit envoyer un pourboire avec le bon montant en centimes (amountCents) via fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, transactionUid: 'tx_1' })
    });

    render(<FloatingChapeau />);
    
    // Ouvrir le chapeau
    fireEvent.click(screen.getByTitle('Ouvrir le Chapeau contextuel'));

    // Sélectionner le preset de 2 € (soit 200 centimes)
    fireEvent.click(screen.getByText('2 €'));

    // Cliquer sur le bouton d'envoi (le texte exact affiché est "Offrir 2 € à VendeurPro")
    fireEvent.click(screen.getByRole('button', { name: /Offrir 2 € à VendeurPro/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/transaction', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"amountCents":200') // 🚀 Vérification cruciale de l'harmonie en centimes
      }));
    });
  });
});