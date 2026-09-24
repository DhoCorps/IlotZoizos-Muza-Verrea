import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceBadge } from '@/components/global/ResourceBadge';
import React from 'react';

describe('UI Component : ResourceBadge (Affichage des Ressources & Soldes)', () => {
  it('🟢 doit afficher uniquement le label (TôX) si aucun montant n\'est fourni', () => {
    render(<ResourceBadge type="TOX" />);
    // Le registre de l'Îlot affiche le label poétique "TôX"
    expect(screen.getByText('TôX')).toBeDefined();
  });

  it('🟢 doit formater et afficher correctement un montant exprimé en centimes pour une monnaie souveraine', () => {
    // 1500 centimes doivent s'afficher "15" avec le label "TôX"
    render(<ResourceBadge type="TOX" amount={1500} isCents={true} />);
    
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('TôX')).toBeDefined();
  });

  it('🟢 doit afficher le montant brut si isCents est défini à false (ex: pour des entités comme les tâches ou atomes)', () => {
    render(<ResourceBadge type="TASK" amount={42} isCents={false} />);
    
    expect(screen.getByText('42')).toBeDefined();
  });
});