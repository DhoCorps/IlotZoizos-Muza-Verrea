// apps/hub-central/src/components/partita/__tests__/FretboardVisualizer.test.tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FretboardVisualizer } from '@/components/partita/FretboardVisualizer';

describe('FretboardVisualizer Component', () => {
  it('🟢 doit s\'afficher correctement avec les valeurs par défaut (6 cordes, 15 cases)', () => {
    render(<FretboardVisualizer />);
    
    // Vérifie la présence de la 15ème case
    expect(screen.getByTestId('fret-15')).toBeInTheDocument();
    // La 16ème ne doit pas exister
    expect(screen.queryByTestId('fret-16')).not.toBeInTheDocument();

    // Vérifie la présence des marqueurs (dots) par défaut
    expect(screen.getByTestId('dot-3')).toBeInTheDocument();
    expect(screen.getByTestId('doubledot-12')).toBeInTheDocument();
    
    // Vérifie la présence de l'accordage par défaut
    expect(screen.getAllByText('E')[0]).toBeInTheDocument();
  });

  it('🟢 doit afficher le titre personnalisé et respecter l\'accessibilité', () => {
    render(<FretboardVisualizer title="Gamme Pentatonique" />);
    
    expect(screen.getByText('Gamme Pentatonique')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveAttribute('aria-label', "Manche d'instrument : Gamme Pentatonique");
  });

  it('🟢 doit s\'adapter dynamiquement à une basse (4 cordes, 24 cases)', () => {
    render(
      <FretboardVisualizer 
        strings={4} 
        frets={24} 
        tuning={['E', 'A', 'D', 'G']} 
      />
    );
    
    // Vérifie l'extension du manche
    expect(screen.getByTestId('fret-24')).toBeInTheDocument();
    expect(screen.getByTestId('doubledot-24')).toBeInTheDocument();

    // La 5ème corde ne doit pas avoir d'accordage affiché
    expect(screen.queryByTestId('tuning-5')).not.toBeInTheDocument();
  });

  it('🟢 doit afficher correctement les positions (notes frettées et cordes à vide)', () => {
    const mockPositions = [
      { string: 6, fret: 0, label: 'E' },          // Corde à vide
      { string: 5, fret: 3, label: 'C', color: '#10B981' }, // Note frettée avec couleur spécifique
      { string: 4, fret: 5, label: 'G' }           // Note frettée classique (couleur fallback)
    ];

    render(<FretboardVisualizer positions={mockPositions} />);

    // Vérification de la corde à vide sur le sillet
    const openStringNote = screen.getByTestId('note-0-6');
    expect(openStringNote).toBeInTheDocument();
    expect(openStringNote).toHaveTextContent('E');

    // Vérification de la note frettée avec couleur personnalisée
    const frettedNoteC = screen.getByTestId('note-3-5');
    expect(frettedNoteC).toBeInTheDocument();
    expect(frettedNoteC).toHaveTextContent('C');
    expect(frettedNoteC).toHaveStyle('background-color: #10B981');

    // Vérification de la note frettée avec la couleur de secours
    const frettedNoteG = screen.getByTestId('note-5-4');
    expect(frettedNoteG).toBeInTheDocument();
    expect(frettedNoteG).toHaveTextContent('G');
    expect(frettedNoteG).toHaveStyle('background-color: #E5484D');
  });
});