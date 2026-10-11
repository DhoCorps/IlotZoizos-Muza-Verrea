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

  it('🟢 doit permettre l’édition du nom, de l’alignement, du niveau, de l’email et de la localisation dans le formulaire cv-header', () => {
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

    const alignmentSelect = screen.getByLabelText(/Alignement JDR/i);
    fireEvent.change(alignmentSelect, { target: { value: 'REPLICANT_BR' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ alignment: 'REPLICANT_BR' })
    );

    const levelInput = screen.getByLabelText(/Niveau/i);
    fireEvent.change(levelInput, { target: { value: '15' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ level: 15 })
    );

    const emailInput = screen.getByLabelText(/Canal Email/i);
    fireEvent.change(emailInput, { target: { value: 'mage@ilot.net' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'mage@ilot.net' })
    );

    const locationInput = screen.getByLabelText(/Localisation/i);
    fireEvent.change(locationInput, { target: { value: 'Forêt de Silice' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Forêt de Silice' })
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

  it('🟢 doit rendre et permettre l’édition du bloc cv-attributes (5 attributs JDR & Voight-Kampff)', () => {
    const blockDef = cvRegistry['cv-attributes'];
    expect(blockDef).toBeDefined();

    const ViewComponent = blockDef.renderView;
    render(<ViewComponent data={blockDef.defaultData} isSelected={false} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('10/20')).toHaveLength(4);

    const mockOnChange = vi.fn();
    const EditComponent = blockDef.renderEditForm;
    render(<EditComponent data={blockDef.defaultData} onChange={mockOnChange} />);

    const intelInput = screen.getByLabelText(/Intelligence/i);
    fireEvent.change(intelInput, { target: { value: '19' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ intelligence: 19 })
    );

    const vkInput = screen.getByLabelText(/Empathie Voight-Kampff/i);
    fireEvent.change(vkInput, { target: { value: '88' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ empathieVoightKampff: 88 })
    );
  });
});