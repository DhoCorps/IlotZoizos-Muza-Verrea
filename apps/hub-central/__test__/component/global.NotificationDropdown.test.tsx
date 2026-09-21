import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationDropdown } from '@/components/global/NotificationDropdown';
import React from 'react';

// 🌿 Mock du hook useNotifications
const mockMarkAsRead = vi.fn();
const mockUseNotifications = {
  notifications: [
    {
      uid: 'notif-1',
      category: 'TEXT',
      isRead: false,
      payload: {
        title: 'Nouveau Monologue',
        message: 'Un oiseau a sédimenté une pensée.',
        targetUrl: '/abyss-blog/test'
      }
    }
  ],
  unreadCount: 1,
  markAsRead: mockMarkAsRead,
};

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications,
}));

describe('Composant : NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit afficher le badge de notification non lue', () => {
    render(<NotificationDropdown />);
    
    // Le badge 1 doit être présent
    const badge = screen.getByText('1');
    expect(badge).toBeDefined();
  });

  it('🟢 doit ouvrir le journal de la canopée au clic et marquer les alertes comme lues', () => {
    render(<NotificationDropdown />);

    // Clique sur la cloche
    const bellButton = screen.getByLabelText('Ouvrir le journal des notifications');
    fireEvent.click(bellButton);

    // Le contenu du journal s'affiche
    expect(screen.getByText('🌿 Journal de la Canopée')).toBeDefined();
    expect(screen.getByText('Nouveau Monologue')).toBeDefined();
    expect(screen.getByText('Un oiseau a sédimenté une pensée.')).toBeDefined();

    // Vérifie que le marquage comme lu a été déclenché en arrière-plan
    expect(mockMarkAsRead).toHaveBeenCalledWith(['notif-1']);
  });
});