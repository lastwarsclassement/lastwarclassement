'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TRANSLATIONS, Lang, LANG_CYCLE, LANG_LABELS } from '@/lib/utils'
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
  const [langOpen, setLangOpen] = useState(false)
  const [eventDs, setEventDs] = useState<{ visible: boolean; pending: boolean }>({ visible: false, pending: false })
  const [seasonEvents, setSeasonEvents] = useState<{ visible: boolean; pending: number }>({ visible: false, pending: 0 })

  useEffect(() => {
    fetch('/api/event-ds/status')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setEventDs(data) })
      .catch(() => {})
    fetch('/api/season-events/status')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSeasonEvents(data) })
      .catch(() => {})
  }, [])

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
            {eventDs.visible && (
              <a href="/dashboard/event-ds" data-tutorial="event-ds-link" style={linkStyle} className="relative px-3 py-1 transition-colors hover:text-yellow-400">
                {t.eventDs}
                {eventDs.pending && (
                  <span
                    className="absolute rounded-full"
                    style={{ top: '2px', right: '-2px', width: '8px', height: '8px', background: '#FFB800' }}
                  />
                )}
              </a>
            )}
            {seasonEvents.visible && (
              <a href="/dashboard/season-events" data-tutorial="season-events-link" style={linkStyle} className="relative px-3 py-1 transition-colors hover:text-yellow-400">
                {t.seasonEvents}
                {seasonEvents.pending > 0 && (
                  <span
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      top: '-4px', right: '-10px', minWidth: '16px', height: '16px', padding: '0 3px',
                      background: '#FFB800', color: '#091830', fontSize: '0.6rem', fontWeight: 800,
                    }}
                  >
                    {seasonEvents.pending}
                  </span>
                )}
              </a>
            )}

            {/* Lang dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangOpen(o => !o)}
                onBlur={() => setTimeout(() => setLangOpen(false), 150)}
                className="text-xs hover:text-yellow-400 rounded-full px-2 py-1 transition-colors flex items-center gap-1"
                style={{ color: '#A8C4E8', border: '1px solid #2A4F8A', minWidth: '44px' }}
              >
                {LANG_LABELS[lang]} <span style={{ fontSize: '0.6rem' }}>▾</span>
              </button>
              {langOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 9999,
                  background: '#0F2548', border: '1px solid #2A4F8A', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: '64px',
                }}>
                  {LANG_CYCLE.map(l => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setLangOpen(false) }}
                      style={{
                        display: 'block', width: '100%', padding: '7px 14px',
                        textAlign: 'left', fontSize: '0.75rem', fontWeight: 700,
                        color: l === lang ? '#FFB800' : '#A8C4E8',
                        background: l === lang ? 'rgba(255,184,0,0.08)' : 'transparent',
                        cursor: 'pointer', border: 'none',
                      }}
                      onMouseEnter={e => { if (l !== lang) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,126,196,0.15)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = l === lang ? 'rgba(255,184,0,0.08)' : 'transparent' }}
                    >
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
