import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CSPostHogProvider, PostHogPageView } from '@/components/providers/PostHogProvider'
import posthog from 'posthog-js'
import { usePathname, useSearchParams } from 'next/navigation'

// Mocks de Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock de posthog-js
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    __loaded: true,
  },
}))

describe('UI & Logique : CSPostHogProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('🟢 doit rendre les enfants et initialiser le provider correctement', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    // 🛠️ CORRECTION : On cast le type de retour pour correspondre aux attentes de Next.js navigation
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('tab=settings') as any)

    const { getByText } = render(
      <CSPostHogProvider>
        <div>Contenu Protégé PostHog</div>
      </CSPostHogProvider>
    )

    expect(getByText('Contenu Protégé PostHog')).toBeDefined()
  })

  it('🟢 doit capturer un pageview PostHog lorsque le pathname change', () => {
    vi.mocked(usePathname).mockReturnValue('/sanctuaire')
    // 🛠️ CORRECTION : Cast propre pour éviter le conflit d'interface ReadonlyURLSearchParams
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('filter=all') as any)

    // Simulation de l'origine de la fenêtre
    const originalOrigin = window.origin
    Object.defineProperty(window, 'origin', {
      value: 'http://localhost:3000',
      configurable: true,
    })

    render(<PostHogPageView />)

    expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: 'http://localhost:3000/sanctuaire?filter=all',
    })

    // Restauration
    Object.defineProperty(window, 'origin', {
      value: originalOrigin,
      configurable: true,
    })
  })
})