import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductComparator } from '@/components/ecommerce/comparator/ProductComparator';
import React from 'react';

describe('Composant ProductComparator', () => {
  const mockOnClose = vi.fn();
  const mockOnRemove = vi.fn();

  const sampleProducts = [
    {
      uid: 'prod_1',
      title: 'Artefact Alpha',
      priceCents: 1500, // 15.00 EUR
      category: 'LORE',
      author: 'Oiseau A',
      description: 'Une description fascinante.'
    },
    {
      uid: 'prod_2',
      title: 'Artefact Beta',
      priceCents: 2500, // 25.00 EUR
      category: 'SPRITE',
      author: 'Oiseau B'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne doit rien rendre si la liste de produits est vide', () => {
    const { container } = render(
      <ProductComparator products={[]} onClose={mockOnClose} onRemove={mockOnRemove} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('doit rendre le comparateur avec les produits et l’emplacement vide s\'il y a moins de 3 artefacts', () => {
    render(
      <ProductComparator products={sampleProducts} onClose={mockOnClose} onRemove={mockOnRemove} />
    );
    
    // Vérification du Header
    expect(screen.getByText(/Comparateur d'Artefacts \(2\/3\)/i)).toBeDefined();
    
    // Vérification des produits
    expect(screen.getByText('Artefact Alpha')).toBeDefined();
    expect(screen.getByText('15.00 EUR')).toBeDefined();
    expect(screen.getByText('Une description fascinante.')).toBeDefined();

    expect(screen.getByText('Artefact Beta')).toBeDefined();
    expect(screen.getByText('25.00 EUR')).toBeDefined();
    
    // Vérification de la présence de la carte "Emplacement vide"
    expect(screen.getByText(/Ajoutez un autre artefact pour comparer/i)).toBeDefined();
  });

  it('ne doit pas rendre l’emplacement vide si 3 artefacts sont comparés', () => {
    const threeProducts = [
      ...sampleProducts,
      { uid: 'prod_3', title: 'Artefact Gamma', priceCents: 3000, category: 'FONT' }
    ];

    render(
      <ProductComparator products={threeProducts} onClose={mockOnClose} onRemove={mockOnRemove} />
    );
    
    expect(screen.getByText(/Comparateur d'Artefacts \(3\/3\)/i)).toBeDefined();
    expect(screen.queryByText(/Ajoutez un autre artefact pour comparer/i)).toBeNull();
  });

  it('doit appeler onClose au clic sur le bouton de fermeture principal', () => {
    render(
      <ProductComparator products={sampleProducts} onClose={mockOnClose} onRemove={mockOnRemove} />
    );
    
    const closeBtn = screen.getByRole('button', { name: /Fermer le comparateur/i });
    fireEvent.click(closeBtn);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('doit appeler onRemove avec l’UID correct au clic sur la croix de suppression d\'un produit', () => {
    render(
      <ProductComparator products={sampleProducts} onClose={mockOnClose} onRemove={mockOnRemove} />
    );
    
    const removeAlphaBtn = screen.getByRole('button', { name: /Retirer Artefact Alpha/i });
    fireEvent.click(removeAlphaBtn);
    
    expect(mockOnRemove).toHaveBeenCalledWith('prod_1');
  });
});