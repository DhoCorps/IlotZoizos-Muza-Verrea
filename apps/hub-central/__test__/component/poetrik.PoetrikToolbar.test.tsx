// apps/hub-central/components/poetrik/__tests__/PoetrikToolbar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PoetrikToolbar } from '@/components/poetrik/PoetrikToolbar';

describe('Composant : PoetrikToolbar', () => {
  const defaultProps = {
    currentLanguage: 'fr',
    onLanguageChange: vi.fn(),
    activeView: 'canvas' as const,
    onViewChange: vi.fn(),
    onSave: vi.fn(),
  };

  it('🟢 doit afficher les boutons principaux et la langue par défaut', () => {
    render(<PoetrikToolbar {...defaultProps} />);
    
    expect(screen.getByText('Français')).toBeDefined();
    expect(screen.getByText('🪶 Atelier')).toBeDefined();
    expect(screen.getByText('⚙️ Sceau & SEO')).toBeDefined();
    expect(screen.getByText('Sceller ✨')).toBeDefined();
  });

  it('🟢 doit déclencher onSave au clic sur Sceller', () => {
    render(<PoetrikToolbar {...defaultProps} />);
    const saveBtn = screen.getByText('Sceller ✨');
    
    fireEvent.click(saveBtn);
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('🟢 doit ouvrir la modale Sceau & SEO et modifier le Voile de Catharsis', () => {
    const mockOnCatharsisChange = vi.fn();
    
    render(
      <PoetrikToolbar 
        {...defaultProps} 
        catharsisVeil={false} 
        onCatharsisChange={mockOnCatharsisChange} 
      />
    );

    // 1. Ouvre la modale
    const settingsBtn = screen.getByTestId('settings-toggle');
    fireEvent.click(settingsBtn);

    // 2. Vérifie la présence de la modale
    expect(screen.getByTestId('settings-modal')).toBeDefined();

    // 3. Clic sur le checkbox du Voile de Catharsis
    const catharsisCheckbox = screen.getByTestId('catharsis-checkbox');
    fireEvent.click(catharsisCheckbox);

    expect(mockOnCatharsisChange).toHaveBeenCalledWith(true);
  });

  it('🟢 doit mettre à jour les données SEO', () => {
    const mockOnSeoChange = vi.fn();
    const initialSeo = { metaTitle: '', metaDescription: '' };
    
    render(
      <PoetrikToolbar 
        {...defaultProps} 
        seoData={initialSeo} 
        onSeoChange={mockOnSeoChange} 
      />
    );

    // Ouvre la modale
    fireEvent.click(screen.getByTestId('settings-toggle'));

    // Trouve l'input du Meta Title et écrit dedans
    const titleInput = screen.getByPlaceholderText(/Meta Title/i);
    fireEvent.change(titleInput, { target: { value: 'Chant du vent' } });

    expect(mockOnSeoChange).toHaveBeenCalledWith({
      metaTitle: 'Chant du vent',
      metaDescription: ''
    });
  });

  it('🟢 doit changer le thème visuel', () => {
    const mockOnThemeChange = vi.fn();
    
    render(
      <PoetrikToolbar 
        {...defaultProps} 
        theme="night" 
        onThemeChange={mockOnThemeChange} 
      />
    );

    const themeSelect = screen.getByTestId('theme-selector');
    fireEvent.change(themeSelect, { target: { value: 'paper' } });

    expect(mockOnThemeChange).toHaveBeenCalledWith('paper');
  });
});