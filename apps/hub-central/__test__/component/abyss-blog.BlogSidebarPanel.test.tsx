import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogSidebarPanel } from '@/components/abyss-blog/BlogSideBarPanel';
import { blogRegistry } from '@/components/abyss-blog/BlogRegistry';
import React from 'react';

describe('Composant Front-End : BlogSidebarPanel', () => {
  it('doit afficher l\'état vide si aucun bloc n\'est sélectionné', () => {
    render(
      <BlogSidebarPanel 
        selectedBlock={null} 
        registry={blogRegistry} 
        onUpdateData={vi.fn()} 
        onClose={vi.fn()} 
      />
    );

    expect(screen.getByText(/Panneau Abyss/i)).toBeDefined();
    expect(screen.getByText(/Sélectionne un bloc/i)).toBeDefined();
  });

  it('doit rendre le formulaire d\'édition du bloc header lorsqu\'il est sélectionné', () => {
    const mockBlock = {
      id: 'block-1',
      type: 'blog-header',
      title: 'Bloc En-tête',   // 🛠️ Ajouté pour satisfaire UniversalBlock
      enabled: true,           // 🛠️ Ajouté pour satisfaire UniversalBlock
      layout: { x: 0, y: 0, w: 12, h: 2 },
      data: { title: 'Titre de Test', subtitle: 'Sous-titre', category: 'Dev' }
    };

    const handleUpdate = vi.fn();
    const handleClose = vi.fn();

    render(
      <BlogSidebarPanel 
        selectedBlock={mockBlock} 
        registry={blogRegistry} 
        onUpdateData={handleUpdate} 
        onClose={handleClose} 
      />
    );

    expect(screen.getByText(/Config : En-tête de l’Article/i)).toBeDefined();

    const inputTitle = screen.getByDisplayValue('Titre de Test');
    expect(inputTitle).toBeDefined();

    fireEvent.change(inputTitle, { target: { value: 'Nouveau Titre' } });
    expect(handleUpdate).toHaveBeenCalledWith('block-1', expect.objectContaining({ title: 'Nouveau Titre' }));
  });

  it('doit appeler onClose lors du clic sur le bouton de fermeture', () => {
    const mockBlock = {
      id: 'block-1',
      type: 'blog-header',
      title: 'Bloc En-tête',
      enabled: true,
      layout: { x: 0, y: 0, w: 12, h: 2 },
      data: {}
    };

    const handleClose = vi.fn();

    render(
      <BlogSidebarPanel 
        selectedBlock={mockBlock} 
        registry={blogRegistry} 
        onUpdateData={vi.fn()} 
        onClose={handleClose} 
      />
    );

    const closeBtn = screen.getByTitle('Fermer le panneau');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});