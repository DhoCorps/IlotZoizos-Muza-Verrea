import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CopyrightBanner } from '@/components/global/CopyrightBanner';

describe('Composant : CopyrightBanner', () => {
  
  it('🟢 doit afficher le mode display par défaut et rendre le sceau cryptographique', () => {
    render(
      <CopyrightBanner 
        metadata={{ role: 'CREATOR', isExclusiveIlot: true }} 
        digitalSignature="SHA256_123456789"
        authorUid="user_999"
      />
    );

    expect(screen.getByText('🎨 Œuvre Originale')).toBeDefined();
    expect(screen.getByText('✨ Exclusivité Îlot')).toBeDefined();
    expect(screen.getByText('Sceau : SHA256_123456789')).toBeDefined();
    expect(screen.getByText('user_999')).toBeDefined();
  });

  it('🟢 doit afficher les notes de sublimation en mode display', () => {
    render(
      <CopyrightBanner 
        metadata={{ 
          role: 'SUBLIMATOR', 
          isExclusiveIlot: false, 
          originalAuthor: 'Auteur Inconnu',
          originalWorkTitle: 'Sample Brut',
          sublimationNotes: 'Ajout de delay et EQ' 
        }} 
      />
    );

    expect(screen.getByText('✨ Œuvre Sublimée')).toBeDefined();
    expect(screen.getByText(/Auteur Inconnu/)).toBeDefined();
    expect(screen.getByText(/Sample Brut/)).toBeDefined();
    expect(screen.getByText(/Ajout de delay et EQ/)).toBeDefined();
  });

  it('🟢 doit gérer le mode édition et propager les changements via onChange', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CopyrightBanner 
        mode="edit" 
        metadata={{ role: 'CREATOR', isExclusiveIlot: false }} 
        onChange={mockOnChange} 
      />
    );

    const select = screen.getByLabelText('Votre rôle dans cette œuvre');
    fireEvent.change(select, { target: { value: 'SUBLIMATOR' } });

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ role: 'SUBLIMATOR' }));
  });

  it('🟢 doit forcer isExclusiveIlot à false si le rôle devient CURATOR en mode édition', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CopyrightBanner 
        mode="edit" 
        metadata={{ role: 'CREATOR', isExclusiveIlot: true }} 
        onChange={mockOnChange} 
      />
    );

    const select = screen.getByLabelText('Votre rôle dans cette œuvre');
    fireEvent.change(select, { target: { value: 'CURATOR' } });

    expect(mockOnChange).toHaveBeenCalledWith({ role: 'CURATOR', isExclusiveIlot: false });
  });
});