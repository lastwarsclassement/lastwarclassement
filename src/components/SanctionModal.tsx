'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Player, Week, Sanction } from '@/types'

interface Props {
  players: Player[]
  week: Week
  existingSanctions: Sanction[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function SanctionModal({ players, week, existingSanctions, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePlayer(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    setSelected(players.map(p => p.id))
  }

  function deselectAll() {
    setSelected([])
  }

  // Count existing sanctions per player
  const sanctionCount = (playerId: string) =>
    existingSanctions.filter(s => s.player_id === playerId).length

  async function handleSave() {
    if (selected.length === 0) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/sanction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: week.id,
        playerIds: selected,
        points: -5,
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">⚠️ {t.sanctions}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          {t.sanctionMinus5} · {lang === 'fr' ? 'Sélectionnez les joueurs à sanctionner' : 'Select players to sanction'}
        </p>

        {/* Controls */}
        <div className="flex gap-2 mb-3">
          <button onClick={selectAll} className="btn-secondary text-xs py-1">{t.selectAll}</button>
          <button onClick={deselectAll} className="btn-secondary text-xs py-1">{t.deselect}</button>
          <span className="text-xs text-slate-400 self-center ml-auto">
            {selected.length} {lang === 'fr' ? 'sélectionné(s)' : 'selected'}
          </span>
        </div>

        {/* Player list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-96 overflow-y-auto pr-1">
          {players.map(player => {
            const isSelected = selected.includes(player.id)
            const existingCount = sanctionCount(player.id)

            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 bg-slate-800'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                  isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-600'
                }`}>
                  {isSelected ? '✓' : ''}
                </span>
                <span className="text-sm flex-1 truncate">{player.display_name}</span>
                {existingCount > 0 && (
                  <span className="text-xs text-red-400 flex-shrink-0">
                    {existingCount}× ⚠️
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-sm text-red-300">
            {lang === 'fr'
              ? `${selected.length} joueur(s) · -5 pts chacun = -${selected.length * 5} pts au total`
              : `${selected.length} player(s) · -5 pts each = -${selected.length * 5} pts total`
            }
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary">{t.cancel}</button>
          <button
            onClick={handleSave}
            className="btn-danger"
            disabled={saving || selected.length === 0}
          >
            {saving ? t.loading : `⚠️ ${lang === 'fr' ? 'Sanctionner' : 'Apply Sanction'} (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
