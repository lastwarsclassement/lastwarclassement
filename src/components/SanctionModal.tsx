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
  const [value, setValue] = useState(5)
  const [saving, setSaving] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
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
    if (selected.length === 0 || !value) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/sanction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: week.id,
        playerIds: selected,
        points: -Math.abs(value),
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

  async function handleCancelSanction(sanctionId: string) {
    setCancelingId(sanctionId)
    setError('')

    const res = await fetch('/api/admin/sanction', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sanctionId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      setCancelingId(null)
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
          {lang === 'fr' ? 'Sélectionnez les joueurs à sanctionner' : 'Select players to sanction'}
        </p>

        {/* Points value */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">
            {lang === 'fr' ? 'Points à retirer' : 'Points to deduct'}
          </label>
          <input
            type="number"
            min={1}
            value={value}
            onChange={e => setValue(Math.max(1, Number(e.target.value) || 1))}
            className="input-field w-20 text-sm py-1"
          />
        </div>

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
              ? `${selected.length} joueur(s) · -${value} pts chacun = -${selected.length * value} pts au total`
              : `${selected.length} player(s) · -${value} pts each = -${selected.length * value} pts total`
            }
          </div>
        )}

        {/* Existing sanctions this week */}
        {existingSanctions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-2">
              {lang === 'fr' ? 'Sanctions en cours cette semaine' : 'Sanctions applied this week'}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {existingSanctions.map(s => {
                const player = players.find(p => p.id === s.player_id)
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-800/50">
                    <span className="text-white flex-1 truncate">{player?.display_name ?? '—'}</span>
                    <span className="text-red-400 font-medium">{s.points}</span>
                    <button
                      onClick={() => handleCancelSanction(s.id)}
                      disabled={cancelingId === s.id}
                      className="text-slate-400 hover:text-red-400 transition-colors px-1"
                      title={lang === 'fr' ? 'Annuler cette sanction' : 'Cancel this sanction'}
                    >
                      {cancelingId === s.id ? '…' : '✕'}
                    </button>
                  </div>
                )
              })}
            </div>
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
