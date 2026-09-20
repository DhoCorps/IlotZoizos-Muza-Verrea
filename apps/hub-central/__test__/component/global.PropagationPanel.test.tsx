import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropagationPanel } from '../../components/global/PropagationPanel';

describe('UI: PropagationPanel (Panneau de Diffusion Organique)', () => {

  const mockContacts = [
    { uid: 'contact_1', pseudo: 'OiseauBleu' },
    { uid: 'contact_2', pseudo: 'Sélénite' }
  ];

  it('🟢 doit afficher par défaut le mode de diffusion globale avec son bouton dédié', () => {
    render(<PropagationPanel artifactUid="art_1" artifactType="BLOG" onPropagate={async () => {}} />);

    expect(screen.getByText('Diffusion à l\'ensemble du réseau')).toBeDefined();
    expect(screen.getByRole('button', { name: /Diffuser au Réseau/i })).toBeDefined();
  });

  it('🟢 doit basculer vers le mode ciblé et afficher la liste des contacts lors du clic sur Partage Ciblé', () => {
    render(
      <PropagationPanel 
        artifactUid="art_1" 
        artifactType="BLOG" 
        contacts={mockContacts} 
        onPropagate={async () => {}} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Partage Ciblé/i }));

    expect(screen.getByText('OiseauBleu')).toBeDefined();
    expect(screen.getByText('Sélénite')).toBeDefined();
    expect(screen.getByRole('button', { name: /Transmettre aux contacts/i })).toBeDefined();
  });

  it('🔴 doit désactiver la soumission en mode TARGETED si aucun contact n\'est sélectionné', () => {
    render(
      <PropagationPanel 
        artifactUid="art_1" 
        artifactType="BLOG" 
        contacts={mockContacts} 
        onPropagate={async () => {}} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Partage Ciblé/i }));

    const submitBtn = screen.getByRole('button', { name: /Transmettre aux contacts/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('🟢 doit permettre de sélectionner des contacts et propager en mode TARGETED', async () => {
    const handlePropagate = vi.fn().mockResolvedValue(undefined);

    render(
      <PropagationPanel 
        artifactUid="art_1" 
        artifactType="BLOG" 
        contacts={mockContacts} 
        onPropagate={handlePropagate} 
      />
    );

    // Basculer en mode ciblé
    fireEvent.click(screen.getByRole('button', { name: /Partage Ciblé/i }));

    // Sélectionner un contact
    fireEvent.click(screen.getByText('OiseauBleu'));

    const submitBtn = screen.getByRole('button', { name: /Transmettre aux contacts/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(false);

    // Soumettre
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handlePropagate).toHaveBeenCalledWith({
      scope: 'TARGETED',
      receiverUids: ['contact_1'],
      customMessage: undefined
    });
  });

  it('🟢 doit propager en mode GLOBAL avec les bons paramètres', async () => {
    const handlePropagate = vi.fn().mockResolvedValue(undefined);

    render(
      <PropagationPanel 
        artifactUid="art_1" 
        artifactType="BLOG" 
        onPropagate={handlePropagate} 
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Diffuser au Réseau/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handlePropagate).toHaveBeenCalledWith({
      scope: 'GLOBAL',
      receiverUids: [],
      customMessage: undefined
    });
  });
});