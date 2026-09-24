import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalBarterDrawer } from '@/components/global/GlobalBarterDrawer';
import React from 'react';

describe('UI Component : GlobalBarterDrawer (Comptoir de Barter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit afficher le bouton flottant d\'accès au Barter', () => {
    render(<GlobalBarterDrawer />);
    expect(screen.getByTitle('Ouvrir le Comptoir de Barter')).toBeDefined();
  });

  it('🟢 doit ouvrir le panneau latéral au clic et soumettre un pari avec des montants en centimes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, isWinner: true })
    });

    render(<GlobalBarterDrawer userTasks={[{ uid: 'task_1', title: 'Tâche Test' }]} />);

    // Ouvrir le Drawer
    fireEvent.click(screen.getByTitle('Ouvrir le Comptoir de Barter'));

    expect(screen.getByText('Le Comptoir de Barter')).toBeDefined();

    // Cliquer sur le bouton de lancement du dé
    fireEvent.click(screen.getByRole('button', { name: /Lancer le Dé du Troc 🦅/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/games/bet', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"targets":[{"type":"KAOS","amount":5000}]') // 🚀 50 * 100 centimes
      }));
    });
  });
});