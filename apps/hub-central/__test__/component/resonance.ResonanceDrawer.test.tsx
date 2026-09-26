import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResonanceDrawer from '@/components/resonance/ResonanceDrawer';
import React from 'react';
import '@testing-library/jest-dom'; // 🪡 FIX CRITIQUE : Active .toBeInTheDocument()

vi.mock('@/components/resonance/ResonancePanel', () => ({
  default: () => <div data-testid="mock-resonance-panel" />
}));

vi.mock('@/components/resonance/FollowButton', () => ({
  FollowButton: () => <button>S'abonner</button>
}));

describe('Composant : ResonanceDrawer', () => {
  it('🟢 ne doit rien rendre si isOpen est false', () => {
    const { container } = render(<ResonanceDrawer isOpen={false} onClose={vi.fn()} targetUid="u_1" />);
    expect(container.firstChild).toBeNull();
  });

  it('🟢 doit afficher le tiroir et ses composants si isOpen est true', () => {
    render(<ResonanceDrawer isOpen={true} onClose={vi.fn()} targetUid="u_1" entityId="f_1" />);

    expect(screen.getByText(/Tiroir de Résonance/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-resonance-panel')).toBeInTheDocument();
  });

  it('🟢 doit déclencher onClose lors du clic sur le bouton de fermeture', () => {
    const handleClose = vi.fn();
    render(<ResonanceDrawer isOpen={true} onClose={handleClose} targetUid="u_1" />);

    const closeBtn = screen.getByRole('button', { name: /Fermer/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});