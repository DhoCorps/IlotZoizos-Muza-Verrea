// apps/hub-central/__test__/components/abyss-blog/BlogRegistry.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { blogRegistry } from '@/components/abyss-blog/BlogRegistry';
import React from 'react';

describe('Registre de Blocs : blogRegistry', () => {
  describe('Bloc : blog-header', () => {
    const blockConfig = blogRegistry['blog-header'];

    it('doit posséder les propriétés et les données par défaut requises', () => {
      expect(blockConfig).toBeDefined();
      expect(blockConfig.label).toBe('En-tête de l’Article');
      expect(blockConfig.defaultData.title).toBe('Chronique des Profondeurs');
      expect(blockConfig.defaultLayout).toEqual({ x: 0, y: 0, w: 12, h: 2 });
    });

    it('doit rendre correctement la vue (renderView)', () => {
      const RenderViewComp = blockConfig.renderView;
      render(<RenderViewComp data={blockConfig.defaultData} isSelected={false} />);

      expect(screen.getByText('Chronique des Profondeurs')).toBeDefined();
      expect(screen.getByText(/Réflexions sur les flux asynchrones/i)).toBeDefined();
      expect(screen.getByText(/Par Oiseau des Abysses/i)).toBeDefined();
      expect(screen.getByText('TUTORIAL')).toBeDefined();
    });

    it('doit rendre le formulaire d\'édition (renderEditForm) et propager le changement', () => {
      const handleChange = vi.fn();
      const EditFormComp = blockConfig.renderEditForm;
      render(<EditFormComp data={blockConfig.defaultData} onChange={handleChange} />);

      const titleInput = screen.getByDisplayValue('Chronique des Profondeurs');
      expect(titleInput).toBeDefined();

      fireEvent.change(titleInput, { target: { value: 'Nouveau Titre d\'Article' } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nouveau Titre d\'Article' })
      );
    });
  });

  describe('Bloc : blog-markdown', () => {
    const blockConfig = blogRegistry['blog-markdown'];

    it('doit posséder les propriétés et données par défaut du paragraphe', () => {
      expect(blockConfig).toBeDefined();
      expect(blockConfig.label).toBe('Paragraphe de Prose');
      expect(blockConfig.defaultData.content).toContain('Rédigez votre prose ici');
    });

    it('doit rendre correctement le contenu textuel (renderView)', () => {
      const RenderViewComp = blockConfig.renderView;
      render(<RenderViewComp data={{ content: 'Texte de test markdown' }} isSelected={false} />);

      expect(screen.getByText('Texte de test markdown')).toBeDefined();
      expect(screen.getByText('Paragraphe')).toBeDefined();
    });

    it('doit permettre l\'édition de la prose via renderEditForm', () => {
      const handleChange = vi.fn();
      const EditFormComp = blockConfig.renderEditForm;
      render(<EditFormComp data={{ content: 'Ancien texte' }} onChange={handleChange} />);

      const textarea = screen.getByDisplayValue('Ancien texte');
      expect(textarea).toBeDefined();

      fireEvent.change(textarea, { target: { value: 'Texte mis à jour' } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Texte mis à jour' })
      );
    });
  });

  describe('Bloc : blog-code', () => {
    const blockConfig = blogRegistry['blog-code'];

    it('doit posséder les propriétés et données par défaut du bloc code', () => {
      expect(blockConfig).toBeDefined();
      expect(blockConfig.label).toBe('Bloc de Code / Sceau');
      expect(blockConfig.defaultData.language).toBe('typescript');
    });

    it('doit rendre le snippet de code et le langage (renderView)', () => {
      const RenderViewComp = blockConfig.renderView;
      render(<RenderViewComp data={{ language: 'typescript', snippet: 'const x = 42;' }} isSelected={false} />);

      expect(screen.getByText('typescript')).toBeDefined();
      expect(screen.getByText('const x = 42;')).toBeDefined();
    });

    it('doit permettre de modifier le langage et le code source via renderEditForm', () => {
      const handleChange = vi.fn();
      const EditFormComp = blockConfig.renderEditForm;
      render(<EditFormComp data={{ language: 'javascript', snippet: 'console.log(1);' }} onChange={handleChange} />);

      const langInput = screen.getByDisplayValue('javascript');
      const codeTextarea = screen.getByDisplayValue('console.log(1);');

      expect(langInput).toBeDefined();
      expect(codeTextarea).toBeDefined();

      fireEvent.change(codeTextarea, { target: { value: 'console.log(2);' } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ snippet: 'console.log(2);' })
      );
    });
  });
});