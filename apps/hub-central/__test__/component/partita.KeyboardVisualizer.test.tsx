// apps/hub-central/src/components/partita/__tests__/KeyboardVisualizer.test.tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KeyboardVisualizer } from '@/components/partita/KeyboardVisualizer';

describe('KeyboardVisualizer Component', () => {
  it('🟢 doit s\'afficher correctement avec les valeurs par défaut (2 octaves depuis l\'octave 2)', () => {
    render(<KeyboardVisualizer />);
    
    // Vérifie la présence de l'accessibilité
    expect(screen.getByRole('figure')).toHaveAttribute('aria-label', "Visualiseur de clavier");

    // Vérifie la présence des premières et dernières touches blanches attendues (C2 à B3)
    expect(screen.getByTestId('white-key-C2')).toBeInTheDocument();
    expect(screen.getByTestId('white-key-B3')).toBeInTheDocument();
    
    // Vérifie qu'il n'y a pas d'octave 4
    expect(screen.queryByTestId('white-key-C4')).not.toBeInTheDocument();

    // Vérifie la présence de quelques touches noires spécifiques
    expect(screen.getByTestId('black-key-C#2')).toBeInTheDocument();
    expect(screen.getByTestId('black-key-G#3')).toBeInTheDocument();
  });

  it('🟢 doit afficher le titre personnalisé et respecter l\'accessibilité', () => {
    render(<KeyboardVisualizer title="Accord de Do Majeur 7" />);
    
    expect(screen.getByText('Accord de Do Majeur 7')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveAttribute('aria-label', "Clavier virtuel : Accord de Do Majeur 7");
  });

  it('🟢 doit générer dynamiquement un clavier basé sur les props', () => {
    // Clavier d'une seule octave commençant à l'octave 4
    render(<KeyboardVisualizer startOctave={4} octaves={1} />);
    
    expect(screen.getByTestId('white-key-C4')).toBeInTheDocument();
    expect(screen.getByTestId('white-key-B4')).toBeInTheDocument();
    
    expect(screen.queryByTestId('white-key-C3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('white-key-C5')).not.toBeInTheDocument();
  });

  it('🟢 doit afficher correctement les positions actives (touches blanches et noires)', () => {
    const mockPositions = [
      { note: 'C', octave: 2, label: 'R' },                   // Touche blanche avec octave précise
      { note: 'D#', octave: 2, label: '3m', color: '#10B981' }, // Touche noire avec couleur spécifique
      { note: 'G', label: '5P' }                              // Note répétée sur toutes les octaves
    ];

    render(<KeyboardVisualizer positions={mockPositions} octaves={2} startOctave={2} />);

    // Vérification de la touche blanche C2
    const markerC2 = screen.getByTestId('active-marker-C2');
    expect(markerC2).toBeInTheDocument();
    expect(markerC2).toHaveTextContent('R');
    expect(markerC2).toHaveStyle('background-color: #E5484D'); // Couleur par défaut du thème

    // Vérification de la touche noire D#2 avec couleur spécifique
    const markerDSharp2 = screen.getByTestId('active-marker-D#2');
    expect(markerDSharp2).toBeInTheDocument();
    expect(markerDSharp2).toHaveTextContent('3m');
    expect(markerDSharp2).toHaveStyle('background-color: #10B981');

    // Vérification de la propagation de la note sans octave (G)
    const markerG2 = screen.getByTestId('active-marker-G2');
    const markerG3 = screen.getByTestId('active-marker-G3');
    
    expect(markerG2).toBeInTheDocument();
    expect(markerG3).toBeInTheDocument();
    expect(markerG2).toHaveTextContent('5P');
    expect(markerG3).toHaveTextContent('5P');
    
    // Vérifie qu'une note non spécifiée n'a pas de marqueur
    expect(screen.queryByTestId('active-marker-D2')).not.toBeInTheDocument();
  });
});