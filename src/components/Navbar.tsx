'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import TutorialSpotlight, { startTutorial } from './TutorialSpotlight'

interface NavbarProps {
  lang: Lang
  setLang: (l: Lang) => void
  isAdmin?: boolean
  playerName?: string
  onProfile?: () => void
}

export default function Navbar({ lang, setLang, isAdmin, playerName, onProfile }: NavbarProps) {
  const router = useRouter()
  const t = TRANSLATIONS[lang]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const linkStyle = {
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    fontSize: '0.8rem',
    color: '#fff',
  }

  return (
    <>
      <nav className="sticky top-0 z-40" style={{
        background: 'linear-gradient(180deg, rgba(9,24,48,0.97) 0%, rgba(9,24,48,0.90) 100%)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid rgba(74,126,196,0.4)',
        height: '64px',
      }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div className="flex flex-col leading-tight">
              <span className="logo-text text-lg">Classement Last War</span>
              <span style={{ fontFamily: 'var(--font-body), Nunito, sans-serif', fontSize: '0.7rem', color: '#5B7FA8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Alliance 3NOV</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">

            {/* Nav links */}
            <a href="/dashboard" style={linkStyle} className="px-3 py-1 transition-colors hover:text-yellow-400">
              {t.dashboard}
            </a>
            {isAdmin && (
              <a href="/dashboard/users" style={linkStyle} className="px-3 py-1 transition-colors hover:text-yellow-400">
                {lang === 'fr' ? 'Joueurs' : 'Players'}
              </a>
            )}
            <a href="/dashboard/history" data-tutorial="history-link" style={linkStyle} className="px-3 py-1 transition-colors hover:text-yellow-400">
              {t.history}
            </a>

            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="text-xs hover:text-yellow-400 rounded-full px-2 py-1 transition-colors"
              style={{ color: '#A8C4E8', border: '1px solid #2A4F8A' }}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            {/* Tutorial button */}
            <button
              onClick={() => startTutorial(isAdmin ? 'admin' : 'reader')}
              className="flex items-center justify-center rounded-full transition-all hover:border-yellow-400 hover:text-yellow-400"
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #2A4F8A',
                color: '#5B7FA8',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-heading), Oswald, sans-serif',
                fontWeight: 700,
                flexShrink: 0,
              }}
              title={lang === 'fr' ? 'Guide d\'utilisation' : 'User guide'}
            >
              ?
            </button>

            {/* Player name */}
            {playerName && (
              <span className="text-sm hidden sm:block px-2" style={{ color: '#A8C4E8' }}>
                {playerName}
              </span>
            )}

            {/* Profile button */}
            {onProfile && (
              <button
                data-tutorial="profile-btn"
                onClick={onProfile}
                className="p-1 transition-colors hover:text-yellow-400"
                style={{ color: '#5B7FA8' }}
                title={lang === 'fr' ? 'Paramètres du profil' : 'Profile settings'}
              >
                ⚙️
              </button>
            )}

            {/* Logout */}
            <button onClick={handleLogout} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              {t.logout}
            </button>

          </div>
        </div>
      </nav>

      <TutorialSpotlight isAdmin={!!isAdmin} lang={lang} />
    </>
  )
}
