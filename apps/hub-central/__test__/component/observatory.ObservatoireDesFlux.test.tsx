import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ObservatoireDesFlux } from '../../components/observatory/ObservatoireDesFlux';

describe('UI : ObservatoireDesFlux (Tableau de bord du Passeur)', () => {

  const mockArtifacts = [
    {
      uid: 'art-1',
      title: 'Monologue sur la Canopée',
      type: 'BLOG',
      merciCount: 12,
      propagatedAt: new Date().toISOString()
    },
    {
      uid: 'art-2',
      title: 'Suite Lyrika No. 4',
      type: 'LYRIKA',
      merciCount: 5,
      propagatedAt: new Date().toISOString()
    }
  ];

  it('🟢 doit afficher le ratio de retour converti en pourcentage', () => {
    render(<ObservatoireDesFlux returnRatio={0.88} eliteProgress={40} />);
    expect(screen.getByText('88%')).toBeDefined();
    expect(screen.getByText('Qualité organique')).toBeDefined();
  });

  it('🟢 doit afficher la progression vers le titre de Passeur d\'Élite', () => {
    render(<ObservatoireDesFlux returnRatio={0.7} eliteProgress={65} />);
    expect(screen.getByText('65%')).toBeDefined();
    expect(screen.getByText(/Passeur d'Élite/i)).toBeDefined();
  });

  it('🟢 doit afficher l\'état vide si aucune œuvre n\'a été propagée', () => {
    render(<ObservatoireDesFlux returnRatio={0.5} eliteProgress={10} propagatedArtifacts={[]} />);
    expect(screen.getByText(/Aucune œuvre propagée pour le moment/i)).toBeDefined();
  });

  it('🟢 doit afficher la liste des œuvres propagées avec leurs "Mercis" respectifs', () => {
    render(<ObservatoireDesFlux returnRatio={0.9} eliteProgress={90} propagatedArtifacts={mockArtifacts} />);

    expect(screen.getByText('Monologue sur la Canopée')).toBeDefined();
    expect(screen.getByText('12 Merci(s)')).toBeDefined();

    expect(screen.getByText('Suite Lyrika No. 4')).toBeDefined();
    expect(screen.getByText('5 Merci(s)')).toBeDefined();
  });
});