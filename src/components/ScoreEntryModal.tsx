'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang, formatScore, parseScoreInput } from '@/lib/utils'
import { isSunday } from '@/lib/scoring'
import type { Player, Week, DailyScore } from '@/types'

interface Props {
  players: Player[]
  week: Week
  existingScores: DailyScore[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function ScoreEntryModal({ players, week, existingScores, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]

  // Only allow dates within the current week (UTC)
  const start = new Date(week.start_date + 'T00:00:00Z')
  const weekDaysEarly: string[] = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
      .toISOString().split('T')[0]
  )

  const todayUTC = new Date().toISOString().split('T')[0]
  // Clamp default date to the week's range
  const defaultDate = weekDaysEarly.includes(todayUTC)
    ? todayUTC
    : (todayUTC < weekDaysEarly[0] ? weekDaysEarly[0] : weekDaysEarly[5])

  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    players.forEach(p => {
      const existing = existingScores.find(
        s => s.player_id === p.id && s.score_date === defaultDate
      )
      if (existing) {
        const raw = isSunday(defaultDate) ? existing.contribution_score : existing.vs_score
        map[p.id] = raw != null ? formatScore(raw) : ''
      } else {
        map[p.id] = ''
      }
    })
    return map
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sunday = isSunday(selectedDate)

  function handleDateChange(date: string) {
    setSelectedDate(date)
    const newScores: Record<string, string> = {}
    const isSun = isSunday(date)
    players.forEach(p => {
      const existing = existingScores.find(s => s.player_id === p.id && s.score_date === date)
      if (existing) {
        const raw = isSun ? existing.contribution_score : existing.vs_score
        newScores[p.id] = raw != null ? formatScore(raw) : ''
      } else {
        newScores[p.id] = ''
      }
    })
    setScores(newScores)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const entries = players.map(p => ({
      player_id: p.id,
      score: parseScoreInput(scores[p.id] || '0'),
    })).filter(e => e.score > 0)

    const res = await fetch('/api/admin/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: week.id,
        weekType: week.type,
        date: selectedDate,
        isSunday: sunday,
        entries,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      setSaving(false)
      return
    }

    onSaved()
  }

  const weekDays = weekDaysEarly

  const dayNames: Record<number, string> = lang === 'fr'
    ? { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
    : { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }

  function getDow(d: string) {
    const day = new Date(d + 'T00:00:00Z').getUTCDay()
    return day === 0 ? 7 : day
  }

  const filledCount = Object.values(scores).filter(v => v && parseScoreInput(v) > 0).length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-3xl fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">📊 {t.enterScores}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Day selector */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {weekDays.map(d => {
            const dow = getDow(d)
            const isSun = dow === 7
            const hasScores = existingScores.some(s => s.score_date === d && (s.vs_score || s.contribution_score))
            return (
              <button
                key={d}
                onClick={() => handleDateChange(d)}
                className={`flex-1 min-w-[60px] py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                  selectedDate === d
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-400/50'
                }`}
              >
                <div>{dayNames[dow]}</div>
                <div className="text-xs opacity-70">{d.slice(8)}</div>
                {hasScores && <div className="text-xs mt-0.5">✓</div>}
                {isSun && <div className="text-xs">🤝</div>}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-slate-400 mb-3">
          {sunday
            ? `📅 ${t.sunday} — ${t.contribScore}`
            : `📅 ${new Date(selectedDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })} — ${t.vsScore}`
          }
          {!sunday && week.type === 'eco' && getDow(selectedDate) <= 4 && (
            <span className="ml-2 text-amber-400">· Éco: classement par proximité à 7,2M</span>
          )}
          <span className="ml-3 text-slate-500">{filledCount}/{players.length} saisis</span>
        </p>

        <p className="text-xs text-slate-500 mb-4">
          {lang === 'fr' ? 'Format : 7 200 000' : 'Format: 7 200 000'}
        </p>

        {/* Score inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
          {[...players].sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? '')).map((player) => {
            const val = scores[player.id] || ''

            return (
              <div key={player.id} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                <span className="text-slate-200 text-sm flex-1 min-w-0 truncate">{player.display_name}</span>
                <div className="flex-shrink-0 w-32">
                  <input
                    type="text"
                    className="input-field text-right"
                    placeholder={sunday ? '0' : '7 200 000'}
                    value={val}
                    onChange={e => setScores(prev => ({ ...prev, [player.id]: e.target.value }))}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary">{t.cancel}</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving || filledCount === 0}>
            {saving ? t.loading : `${t.save} (${filledCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
