import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { KomptaDashboard } from '@/components/kompta/DashBoard';
import React from 'react';

describe('UI Component : KomptaDashboard (Grand Livre Inaltérable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit charger et afficher correctement les soldes et écritures en centimes convertis', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          summary: {
            totalCreditsCents: 15000, // 150.00 €
            totalDebitsCents: 5000,   // 50.00 €
            netBalanceCents: 10000,   // 100.00 €
            transactionCount: 1
          },
          entries: [
            {
              entryUid: 'ent_1',
              type: 'CREDIT',
              category: 'STORE_SALE',
              amountCents: 15000,
              currency: 'EUR',
              description: 'Vente d’artefact',
              entryHash: 'hash_abc123',
              createdAt: new Date().toISOString()
            }
          ]
        }
      })
    });

    render(<KomptaDashboard />);

    // Attendre la fin du chargement et l'affichage des données
    await waitFor(() => {
      expect(screen.getByText('+150.00 €')).toBeDefined();
      expect(screen.getByText('-50.00 €')).toBeDefined();
      expect(screen.getByText('100.00 €')).toBeDefined();
      expect(screen.getByText('Vente d’artefact')).toBeDefined();
    });
  });
});