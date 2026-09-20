import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommentItem } from '../../components/global/CommentItem';

describe('UI: CommentItem (Composant Récursif des Échos)', () => {
  
  const baseComment = {
    uid: 'comment_1',
    authorUid: 'oiseau_auteur',
    targetUid: 'oeuvre_123',
    targetType: 'BLOG' as const,
    content: 'Une pensée profonde et structurée.',
    allowComments: true,
    allowReactions: true,
    isHidden: false,
    isScholarSealed: false,
    createdAt: new Date('2026-06-06T12:00:00.000Z')
  };

  it('🟢 doit afficher le contenu du commentaire et l\'UID masqué de l\'auteur', () => {
    render(<CommentItem comment={baseComment} currentAuthorUid="autre_oiseau" />);

    expect(screen.getByText('Une pensée profonde et structurée.')).toBeDefined();
    expect(screen.getByText(/Oiseau: oiseau_a/i)).toBeDefined();
  });

  it('🟢 doit afficher le Sceau de l\'Érudit si le commentaire est certifié', () => {
    const sealedComment = { ...baseComment, isScholarSealed: true };
    render(<CommentItem comment={sealedComment} currentAuthorUid="autre_oiseau" />);

    expect(screen.getByText('📜 Sceau de l\'Érudit')).toBeDefined();
  });

  it('🟢 doit afficher le bouton "Rendre occulte" uniquement si l\'utilisateur connecté est l\'auteur', () => {
    // Cas 1 : L'utilisateur EST l'auteur
    const { unmount } = render(
      <CommentItem comment={baseComment} currentAuthorUid="oiseau_auteur" onOccult={() => {}} />
    );
    expect(screen.getByRole('button', { name: /Rendre occulte/i })).toBeDefined();
    unmount();

    // Cas 2 : L'utilisateur N'EST PAS l'auteur
    render(
      <CommentItem comment={baseComment} currentAuthorUid="intrus_oiseau" onOccult={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /Rendre occulte/i })).toBeNull();
  });

  it('🟢 doit déclencher le callback onReply lors du clic sur Répondre', () => {
    const handleReply = vi.fn();
    render(<CommentItem comment={baseComment} currentAuthorUid="autre_oiseau" onReply={handleReply} />);

    fireEvent.click(screen.getByRole('button', { name: /Répondre/i }));
    expect(handleReply).toHaveBeenCalledWith('comment_1');
  });

  it('🟢 doit s\'appeler de manière récursive si des enfants (réponses) sont présents', () => {
    const threadedComment = {
      ...baseComment,
      children: [
        {
          ...baseComment,
          uid: 'comment_child_2',
          content: 'Réponse filaire en cascade.',
          authorUid: 'autre_oiseau'
        }
      ]
    };

    render(<CommentItem comment={threadedComment} currentAuthorUid="autre_oiseau" />);

    // Le commentaire parent et l'enfant doivent tous les deux apparaître dans le DOM
    expect(screen.getByText('Une pensée profonde et structurée.')).toBeDefined();
    expect(screen.getByText('Réponse filaire en cascade.')).toBeDefined();
  });

  it('🟢 doit masquer le contenu et afficher un texte d\'occultation si isHidden est true', () => {
    const hiddenComment = { ...baseComment, isHidden: true };
    render(<CommentItem comment={hiddenComment} currentAuthorUid="oiseau_auteur" />);

    expect(screen.queryByText('Une pensée profonde et structurée.')).toBeNull();
    expect(screen.getByText('Cet écho a été occulté par son auteur.')).toBeDefined();
  });
});