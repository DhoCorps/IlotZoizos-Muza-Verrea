// apps/hub-central/components/poetrik/__tests__/PoemExportVisual.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PoemExportVisual } from '@/components/poetrik/PoemExportVisual';

describe('Composant : PoemExportVisual', () => {
  it('🟢 doit afficher le poème stylisé sur le papier ancien', () => {
    render(
      <PoemExportVisual 
        title="L'Ode" 
        content="Les mots s'envolent." 
        authorPseudo="Plume" 
      />
    );
    
    expect(screen.getByText("L'Ode")).toBeDefined();
    expect(screen.getByText("Les mots s'envolent.")).toBeDefined();
    expect(screen.getByText("— 🪶 Plume")).toBeDefined();
    expect(screen.getByText("Poetrik / Letr'in")).toBeDefined();
  });

  it('🟢 doit déclencher onExportRequest avec la référence du DOM au clic', () => {
    const mockExport = vi.fn();
    render(
      <PoemExportVisual 
        title="Test" 
        content="Contenu" 
        authorPseudo="Auteur" 
        onExportRequest={mockExport}
      />
    );
    
    const exportBtn = screen.getByText('📸 Générer la Carte Poétique');
    fireEvent.click(exportBtn);
    
    // Vérifie que la fonction reçoit bien un élément HTMLDivElement
    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(mockExport.mock.calls[0][0].tagName).toBe('DIV');
  });
});