// apps/hub-central/__test__/component/users.CvProfileEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CvProfileEditor } from '@/components/users/CvProfileEditor';

describe('Composant : CvProfileEditor', () => {
  it('igomba kwerekana uburambe bw\'akazi n\'amashuri byatanzwe', () => {
    const mockCvProfile = {
      experiences: [{ title: 'Developer', company: 'Ilot', isVisibleInCv: true }],
      educations: [{ degree: 'Master', school: 'University', isVisibleInCv: false }]
    };

    const mockOnChange = vi.fn();

    render(<CvProfileEditor cvProfile={mockCvProfile} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('Developer')).toBeDefined();
    expect(screen.getByDisplayValue('Ilot')).toBeDefined();
    expect(screen.getByDisplayValue('Master')).toBeDefined();
    expect(screen.getByDisplayValue('University')).toBeDefined();
  });

  it('igomba guhamagara onChange igihe wongereyeho cyangwa wanditse mu burambe bw\'akazi', () => {
    const mockCvProfile = { experiences: [], educations: [] };
    const mockOnChange = vi.fn();

    render(<CvProfileEditor cvProfile={mockCvProfile} onChange={mockOnChange} />);

    // Utilisation de getAllByRole pour cibler le premier bouton "Yongeraho" (celui des expériences)
    const addButtons = screen.getAllByRole('button', { name: /Yongeraho/i });
    fireEvent.click(addButtons[0]);

    // Emeza ko onChange yahamagawe ubwo bongeraho uburambe bushya
    expect(mockOnChange).toHaveBeenCalled();
  });
});