// apps/hub-central/components/poetrik/__tests__/PoetrikCanvas.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoetrikCanvas } from '@/components/poetrik/PoetrikCanvas';
import { SyllableEngine } from '@ilot/shared-core';

// Mock du Moteur Quantique de Syllabes
vi.mock('@ilot/shared-core', () => ({
  SyllableEngine: {
    countPieds: vi.fn(),
  }
}));

describe('Composant : PoetrikCanvas & Écogramme Rythmique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit afficher le canevas vide avec le message de silence', () => {
    render(<PoetrikCanvas />);
    expect(screen.getByPlaceholderText(/Écris ton vers ici/i)).toBeDefined();
    expect(screen.getByText(/Le silence emplit la page/i)).toBeDefined();
  });

  it('🟢 doit analyser les syllabes et afficher l\'Écogramme Rythmique lors de la frappe', () => {
    vi.mocked(SyllableEngine.countPieds).mockReturnValue(12);

    render(<PoetrikCanvas initialContent="Demain, dès l'aube, à l'heure où blanchit la campagne" />);
    
    // Vérification de l'appel au moteur
    expect(SyllableEngine.countPieds).toHaveBeenCalledWith("Demain, dès l'aube, à l'heure où blanchit la campagne");
    
    // L'Alexandrin doit être détecté et affiché avec son marqueur
    expect(screen.getByText(/12/i)).toBeDefined();
    expect(screen.getByText(/✨/i)).toBeDefined();

    // Vérification de la présence de l'Écogramme
    const ecogrammeContainer = screen.getByTestId('ecogramme');
    expect(ecogrammeContainer.children.length).toBe(12); // L'onde génère exactement 12 barres
  });

  it('🟢 doit déclencher onContentChange et onWordSelect', () => {
    const mockOnContentChange = vi.fn();
    const mockOnWordSelect = vi.fn();
    vi.mocked(SyllableEngine.countPieds).mockReturnValue(4);

    render(
      <PoetrikCanvas 
        onContentChange={mockOnContentChange} 
        onWordSelect={mockOnWordSelect} 
      />
    );

    const textarea = screen.getByPlaceholderText(/Écris ton vers ici/i);
    fireEvent.change(textarea, { target: { value: 'Le vent pleure' } });

    expect(mockOnContentChange).toHaveBeenCalledWith('Le vent pleure');

    // Clic sur un mot généré dans le panneau de scansion
    const wordButton = screen.getByText('vent');
    fireEvent.click(wordButton);

    expect(mockOnWordSelect).toHaveBeenCalledWith('vent');
  });
});