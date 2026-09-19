import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SujetCard } from '@/components/abyss-blog/sujets/SujetCard';

const mockSujet = {
  uid: 's-123',
  title: 'La Forge de Test',
  content: 'Contenu du monologue de test...',
  status: 'PUBLISHED',
  category: 'MONOLOGUE',
  authorUid: 'u-auteur-1',
  resonance: { views: 42 },
  media: { audioTrackUrl: 'https://cdn.ilot/audio.mp3' },
  connections: { relatedProjects: ['p-1'] }
};

describe('Composant Front-End : SujetCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('affiche les données structurelles du sujet', () => {
    render(<SujetCard sujet={mockSujet as any} onEdit={mockOnEdit} currentUserUid="u-visiteur" />);
    
    expect(screen.getByText('La Forge de Test')).toBeDefined();
    expect(screen.getByText('MONOLOGUE')).toBeDefined();
    expect(screen.getByText('"Contenu du monologue de test..."')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('affiche les contrôles souverains (Édition/Suppression) si l\'utilisateur est l\'Auteur', () => {
    render(
      <SujetCard 
        sujet={mockSujet as any} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
        currentUserUid="u-auteur-1" 
      />
    );
    
    const editBtn = screen.getByTitle('Ajuster la pensée');
    const deleteBtn = screen.getByTitle('Brûler le texte');
    
    fireEvent.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith('s-123');

    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('s-123');
  });

  it('masque les contrôles souverains pour un simple visiteur', () => {
    render(<SujetCard sujet={mockSujet as any} onEdit={mockOnEdit} currentUserUid="u-visiteur" />);
    expect(screen.queryByTitle('Ajuster la pensée')).toBeNull();
  });

  it('désactive le bouton de suppression si isDeleting est vrai (Contrôle React Query)', () => {
    render(
      <SujetCard 
        sujet={mockSujet as any} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
        isDeleting={true} 
        currentUserUid="u-auteur-1" 
      />
    );
    
    const deleteBtn = screen.getByTitle('Brûler le texte');
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
  });
});