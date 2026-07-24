'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSLATIONS, Lang, getLocale } from '@/lib/utils'
import type { Profile, Player, Week, SeasonEvent, SeasonEventResponse, SeasonEventStatus } from '@/types'
import Navbar from './Navbar'
import ProfileModal from './ProfileModal'
import SeasonEventModal from './SeasonEventModal'

interface Props {
  profile: Profile | null
  players: Player[]
  activeWeek: Week | null
  events: SeasonEvent[]
  responses: SeasonEventResponse[]
}

export default function SeasonEventsClient({ profile, players, activeWeek, events, responses }: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const [showProfile, setShowProfile] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SeasonEvent | null>(null)
  const t = TRANSLATIONS[lang]

  const isAdmin = profile?.role === 'admin'
  const currentPlayer = players.find(p => p.id === profile?.player_id) ?? null

  const [myResponses, setMyResponses] = useState<Record<string, { status: SeasonEventStatus; editing: boolean }>>(() => {
    const map: Record<string, { status: SeasonEventStatus; editing: boolean }> = {}
    events.forEach(ev => {
      const r = responses.find(resp => resp.event_id === ev.id && resp.player_id === currentPlayer?.id)
      map[ev.id] = { status: r?.status ?? 'absent', editing: !r?.validated }
    })
    return map
  })

  // router.refresh() re-renders with new props but doesn't re-run the useState
  // initializer above — backfill any event created/loaded after first mount.
  useEffect(() => {
    setMyResponses(prev => {
      const missing = events.filter(ev => !prev[ev.id])
      if (missing.length === 0) return prev
      const next = { ...prev }
      missing.forEach(ev => {
        const r = responses.find(resp => resp.event_id === ev.id && resp.player_id === currentPlayer?.id)
        next[ev.id] = { status: r?.status ?? 'absent', editing: !r?.validated }
      })
      return next
    })
  }, [events, responses, currentPlayer?.id])

  const [saving, setSaving] = useState<string | null>(null)

  function formatEventDate(date: string) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString(getLocale(lang), {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  }

  async function handleDeleteEvent(event: SeasonEvent) {
    const msg = lang === 'fr' ? `Supprimer l'event "${event.name}" ?` : `Delete event "${event.name}"?`
    if (!confirm(msg)) return
    await fetch('/api/admin/season-events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id }),
    })
    router.refresh()
  }

  function setStatus(eventId: string, status: SeasonEventStatus) {
    setMyResponses(prev => ({ ...prev, [eventId]: { ...prev[eventId], status } }))
  }

  async function handleRespond(eventId: string, validated: boolean) {
    const current = myResponses[eventId]
    setSaving(eventId)
    await fetch('/api/season-events/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, status: current.status, validated }),
    })
    setMyResponses(prev => ({ ...prev, [eventId]: { ...prev[eventId], editing: !validated } }))
    setSaving(null)
    router.refresh()
  }

  function presentPlayers(eventId: string) {
    return players.filter(p =>
      responses.some(r => r.event_id === eventId && r.player_id === p.id && r.status === 'present')
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar
        lang={lang}
        setLang={setLang}
        isAdmin={isAdmin}
        playerName={currentPlayer?.display_name}
        onProfile={() => setShowProfile(true)}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="lw-title text-2xl">🎉 {t.seasonEvents}</h1>
          {isAdmin && activeWeek && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              + {t.seasonEventCreate}
            </button>
          )}
        </div>

        {!activeWeek && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-400">{t.noActiveWeek}</p>
          </div>
        )}

        {activeWeek && events.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-400">{t.seasonEventNone}</p>
          </div>
        )}

        {activeWeek && events.length > 0 && (
          <div className="space-y-4">
            {events.map(event => {
              const my = myResponses[event.id]
              const present = presentPlayers(event.id)
              return (
                <div key={event.id} className="card p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h2 className="text-white font-semibold">{event.name}</h2>
                      <p className="text-xs text-slate-400 capitalize">
                        {formatEventDate(event.event_date)} · {event.event_time.slice(0, 5)}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button onClick={() => setEditingEvent(event)} className="text-xs btn-secondary py-1 px-2">
                          ✏️ {t.edit}
                        </button>
                        <button onClick={() => handleDeleteEvent(event)} className="text-xs btn-danger py-1 px-2">
                          🗑
                        </button>
                      </div>
                    )}
                  </div>

                  {currentPlayer && my && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <div className="flex gap-1">
                        {(['present', 'absent'] as SeasonEventStatus[]).map(s => (
                          <button
                            key={s}
                            type="button"
                            disabled={!my.editing}
                            onClick={() => setStatus(event.id, s)}
                            className={`py-2 px-4 rounded-lg text-xs font-medium transition-all border ${
                              my.status === s
                                ? 'bg-amber-400 text-black border-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-400/50'
                            } ${!my.editing ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {s === 'present' ? t.statusPresent : t.statusAbsent}
                          </button>
                        ))}
                      </div>
                      {my.editing ? (
                        <button
                          onClick={() => handleRespond(event.id, true)}
                          disabled={saving === event.id}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          {saving === event.id ? t.loading : t.validate}
                        </button>
                      ) : (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-400/10 border-emerald-400/30 text-emerald-400">
                            ✓ {t.eventDsValidated}
                          </span>
                          <button
                            onClick={() => handleRespond(event.id, false)}
                            disabled={saving === event.id}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            {saving === event.id ? t.loading : t.edit}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-400 mb-2">{t.seasonEventPresent} ({present.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {present.map(p => (
                        <span key={p.id} className="text-xs px-2 py-1 rounded-lg bg-slate-800/50 text-slate-200">
                          {p.display_name}
                        </span>
                      ))}
                      {present.length === 0 && <span className="text-xs text-slate-600">—</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && activeWeek && (
        <SeasonEventModal
          week={activeWeek}
          lang={lang}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); router.refresh() }}
        />
      )}

      {editingEvent && activeWeek && (
        <SeasonEventModal
          event={editingEvent}
          week={activeWeek}
          lang={lang}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); router.refresh() }}
        />
      )}

      {showProfile && profile && (
        <ProfileModal
          profile={profile}
          player={currentPlayer}
          lang={lang}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
