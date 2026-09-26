import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LetrinEditor } from '@/components/letrin/LetrinEditor';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom'; // 🪡 Maintient l'accès à toBeInTheDocument

// --- Mocks ---
vi.mock('opentype.js', () => ({
  Path: class {
    moveTo() {}
    lineTo() {}
    close() {}
  },
  Glyph: class {},
  Font: class {
    download = vi.fn();
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('LetrinEditor (Forge Typographique)', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 Doit rendre les panneaux de Taxonomie et d\'Alchimie avec les valeurs par défaut', () => {
    render(<LetrinEditor onSave={mockOnSave} />);

    // Taxonomie
    expect(screen.getByText('Taxonomie')).toBeInTheDocument();
    
    // On prend le premier 'combobox' (Taxonomie)
    const selects = screen.getAllByRole('combobox');
    const selectCategory = selects[0]; 
    
    expect(selectCategory).toHaveValue('LINEALE');
    expect(screen.getByText('Sans empattements (Sans-Serif), épurées et modernes.')).toBeInTheDocument();

    // Alchimie
    expect(screen.getByText('Fréquence Alchimique')).toBeInTheDocument();
    expect(screen.getByText('432 Hz')).toBeInTheDocument();
  });

  it('🟢 Doit permettre d\'ajouter des tags via la touche Entrée', async () => {
    render(<LetrinEditor onSave={mockOnSave} />);
    const user = userEvent.setup();

    const tagInput = screen.getByPlaceholderText('Ajouter un tag...');
    await user.type(tagInput, 'cyberpunk{Enter}');
    
    // Le tag s'affiche avec le #
    expect(screen.getByText('#cyberpunk')).toBeInTheDocument();
    // Le champ input est vidé
    expect(tagInput).toHaveValue('');
  });

  it('🟢 Doit permettre de muter la fréquence', async () => {
    render(<LetrinEditor onSave={mockOnSave} />);
    const user = userEvent.setup();

    expect(screen.getByText('432 Hz')).toBeInTheDocument();
    
    // 🪡 FIX : On prend le premier 'slider' (le 2ème étant l'arrondi du pinceau)
    const sliders = screen.getAllByRole('slider');
    const frequencySlider = sliders[0];

    // On clique sur le bouton de mute (situé juste avant le slider dans la hiérarchie)
    const muteButton = frequencySlider.previousElementSibling?.querySelector('button');
    if (muteButton) await user.click(muteButton);

    expect(screen.getByText('Muet')).toBeInTheDocument();
    expect(frequencySlider).toBeDisabled();
  });

  it('⚡ Doit déclencher le Glitch Abyssal sans planter', async () => {
    render(<LetrinEditor onSave={mockOnSave} />);
    const user = userEvent.setup();

    const glitchButton = screen.getByTitle('Glitch Abyssal');
    await user.click(glitchButton);

    // Le toast de succès doit être appelé
    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalledWith("💥 Glitch Abyssal appliqué !");
  });

  it('🟢 Doit structurer et envoyer le payload complet avec Zod lors de la sauvegarde', async () => {
    render(<LetrinEditor onSave={mockOnSave} fontTitle="Police Test" />);
    const user = userEvent.setup();

    // 1. On change la catégorie (cible le premier select)
    const selects = screen.getAllByRole('combobox');
    const selectCategory = selects[0];
    await user.selectOptions(selectCategory, 'GOTHIQUE');

    // 2. On ajoute un tag
    const tagInput = screen.getByPlaceholderText('Ajouter un tag...');
    await user.type(tagInput, 'sombre{Enter}');

    // 3. Sauvegarde
    const saveButton = screen.getByText('Sauvegarder Projet');
    await user.click(saveButton);

    // Vérification du payload
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const payload = mockOnSave.mock.calls[0][0];

    expect(payload.visibility).toBe('PUBLIC');
    expect(payload.category).toBe('GOTHIQUE');
    expect(payload.tags).toContain('sombre');
    expect(payload.frequencyHz).toBe(432);
    expect(payload.seo.metaTitle).toBe('Police Test');
    expect(payload.copyrightMetadata.isExclusiveIlot).toBe(true);
    expect(payload.matrices).toBeDefined();
  });
});