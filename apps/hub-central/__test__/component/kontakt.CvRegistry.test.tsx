import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { cvRegistry } from '@/components/kontakt/cv-editor/CvRegistry';
import React from 'react';

describe('Registre de blocs CV (cvRegistry)', () => {
  it('🟢 doit rendre correctement la vue du bloc cv-header avec les données par défaut', () => {
    const blockDef = cvRegistry['cv-header'];
    const ViewComponent = blockDef.renderView;
    
    render(<ViewComponent data={blockDef.defaultData} isSelected={false} />);

    expect(screen.getByText('Oiseau Inconnu')).toBeInTheDocument();
    expect(screen.getByText('Mage Fullstack & Sceaux Neo4j')).toBeInTheDocument();
    expect(screen.getByText('Niv. 10')).toBeInTheDocument();
  });

  it('🟢 doit permettre l’édition du nom dans le formulaire cv-header', () => {
    const blockDef = cvRegistry['cv-header'];
    const mockOnChange = vi.fn();
    const EditComponent = blockDef.renderEditForm;

    // 🛠️ Pas de isSelected ici car le formulaire d'édition ne l'attend pas
    render(<EditComponent data={blockDef.defaultData} onChange={mockOnChange} />);

    const input = screen.getByDisplayValue('Oiseau Inconnu');
    fireEvent.change(input, { target: { value: 'Oiseau Architecte' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Oiseau Architecte' })
    );
  });

  it('🟢 doit rendre correctement la vue du bloc cv-skills et lister les compétences', () => {
    const blockDef = cvRegistry['cv-skills'];
    const ViewComponent = blockDef.renderView;

    render(<ViewComponent data={blockDef.defaultData} isSelected={false} />);

    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Neo4j')).toBeInTheDocument();
  });
});