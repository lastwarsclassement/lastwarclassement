'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Player, Week, Reward } from '@/types'

interface Props {
  players: Player[]
  week: Week
  existingRewards: Reward[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function RewardModal({ players, week, existingRewards, lang, onClose, onSaved }: Props) {
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

  // Count existing rewards per player
  const rewardCount = (playerId: string) =>
    existingRewards.filter(r => r.player_id === playerId).length

  async function handleSave() {
    if (selected.length === 0 || !value) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: week.id,
        playerIds: selected,
        points: Math.abs(value),
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

  async function handleCancelReward(rewardId: string) {
    setCancelingId(rewardId)
    setError('')

    const res = await fetch('/api/admin/reward', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId }),
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
          <h2 className="text-xl font-bold text-white">🎁 {t.rewards}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          {lang === 'fr' ? 'Sélectionnez les joueurs à récompenser' : 'Select players to reward'}
        </p>

        {/* Points value */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">
            {lang === 'fr' ? 'Points à ajouter' : 'Points to add'}
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
            const existingCount = rewardCount(player.id)

            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 bg-slate-800'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                  isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                }`}>
                  {isSelected ? '✓' : ''}
                </span>
                <span className="text-sm flex-1 truncate">{player.display_name}</span>
                {existingCount > 0 && (
                  <span className="text-xs text-emerald-400 flex-shrink-0">
                    {existingCount}× 🎁
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
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-sm text-emerald-300">
            {lang === 'fr'
              ? `${selected.length} joueur(s) · +${value} pts chacun = +${selected.length * value} pts au total`
              : `${selected.length} player(s) · +${value} pts each = +${selected.length * value} pts total`
            }
          </div>
        )}

        {/* Existing rewards this week */}
        {existingRewards.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-2">
              {lang === 'fr' ? 'Récompenses en cours cette semaine' : 'Rewards applied this week'}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {existingRewards.map(r => {
                const player = players.find(p => p.id === r.player_id)
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-800/50">
                    <span className="text-white flex-1 truncate">{player?.display_name ?? '—'}</span>
                    <span className="text-emerald-400 font-medium">+{r.points}</span>
                    <button
                      onClick={() => handleCancelReward(r.id)}
                      disabled={cancelingId === r.id}
                      className="text-slate-400 hover:text-red-400 transition-colors px-1"
                      title={lang === 'fr' ? 'Annuler cette récompense' : 'Cancel this reward'}
                    >
                      {cancelingId === r.id ? '…' : '✕'}
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
            className="btn-primary"
            disabled={saving || selected.length === 0}
          >
            {saving ? t.loading : `🎁 ${lang === 'fr' ? 'Récompenser' : 'Apply Reward'} (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
