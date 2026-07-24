'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { SeasonEvent } from '@/types'

interface Props {
  event?: SeasonEvent | null
  weekId: string
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function SeasonEventModal({ event, weekId, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]
  const [name, setName] = useState(event?.name ?? '')
  const [eventDate, setEventDate] = useState(event?.event_date ?? '')
  const [eventTime, setEventTime] = useState(event?.event_time?.slice(0, 5) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/season-events', {
      method: event ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        event
          ? { eventId: event.id, name, eventDate, eventTime }
          : { weekId, name, eventDate, eventTime }
      ),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            🎉 {event ? (lang === 'fr' ? 'Modifier l\'event' : 'Edit event') : t.seasonEventCreate}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{t.seasonEventName}</label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t.seasonEventDay}</label>
              <input
                className="input-field"
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                required
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{t.seasonEventTime}</label>
              <input
                className="input-field"
                type="time"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
                required
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">{t.cancel}</button>
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? t.loading : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
