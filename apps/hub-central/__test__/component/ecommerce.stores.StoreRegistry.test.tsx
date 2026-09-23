import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { storeRegistry } from '@/components/ecommerce/stores/StoreRegistry';
import React from 'react';

describe('StoreRegistry - Blocs E-commerce & Cohérence Monétaire', () => {
  it('doit rendre correctement la vue du bloc product-hero en convertissant priceCents en euros', () => {
    const blockConfig = storeRegistry['product-hero'];
    const sampleData = {
      title: 'Parchemin Test',
      subtitle: 'Description test',
      priceCents: 2500, // 25.00 €
      priceShards: 50,
      category: 'LORE_SCROLL'
    };

    const ViewComponent = blockConfig.renderView;
    render(<ViewComponent data={sampleData} isSelected={false} />);

    expect(screen.getByText('Parchemin Test')).toBeDefined();
    expect(screen.getByText('25.00 €')).toBeDefined();
    expect(screen.getByText('50 Éclats')).toBeDefined();
    expect(screen.getByText('LORE_SCROLL')).toBeDefined();
  });

  it('doit convertir correctement la saisie en euros vers priceCents dans le formulaire d’édition', () => {
    const blockConfig = storeRegistry['product-hero'];
    const initialData = {
      title: 'Artefact Modifiable',
      subtitle: 'Accroche',
      priceCents: 2500, // 25.00 € -> valeur '25' unique (évite le conflit avec priceShards: 10)
      priceShards: 10,
    };

    const mockOnChange = vi.fn();
    
    const EditComponent = blockConfig.renderEditForm;
    render(<EditComponent data={initialData} onChange={mockOnChange} />);

    // Recherche unique du champ de prix en euros via sa valeur distincte '25'
    const priceInput = screen.getByDisplayValue('25'); 
    fireEvent.change(priceInput, { target: { value: '19.99' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priceCents: 1999 // Vérification de la conversion stricte en centimes
      })
    );
  });
});