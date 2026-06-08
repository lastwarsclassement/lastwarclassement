'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Player, Week, WeeklyContribution } from '@/types'

interface Props {
  players: Player[]
  week: Week
  existingContributions: WeeklyContribution[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

const TIER_CONFIG = [
  { tier: 1 as const, points: 10, color: 'amber', label: (t: typeof TRANSLATIONS.fr) => t.top10 },
  { tier: 2 as const, points: 6, color: 'slate', label: (t: typeof TRANSLATIONS.fr) => t.next10 },
  { tier: 3 as const, points: 3, color: 'orange', label: (t: typeof TRANSLATIONS.fr) => t.last10 },
]

export default function AllianceContributionModal({ players, week, existingContributions, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selected, setSelected] = useState<Record<1 | 2 | 3, string[]>>({
    1: existingContributions.filter(c => c.tier === 1).map(c => c.player_id),
    2: existingContributions.filter(c => c.tier === 2).map(c => c.player_id),
    3: existingContributions.filter(c => c.tier === 3).map(c => c.player_id),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allSelected = new Set([...selected[1], ...selected[2], ...selected[3]])
  const currentStep = TIER_CONFIG[step - 1]

  function togglePlayer(playerId: string) {
    setSelected(prev => {
      const current = prev[step]
      if (current.includes(playerId)) {
        return { ...prev, [step]: current.filter(id => id !== playerId) }
      }
      if (current.length >= 10) return prev // max 10
      return { ...prev, [step]: [...current, playerId] }
    })
  }

  function canProceed() {
    return selected[step].length === 10
  }

  async function handleSave() {
    if (selected[1].length !== 10 || selected[2].length !== 10 || selected[3].length !== 10) {
      setError(lang === 'fr' ? 'Chaque étape doit avoir exactement 10 joueurs.' : 'Each step must have exactly 10 players.')
      return
    }

    setSaving(true)
    setError('')

    const contributions = [
      ...selected[1].map(id => ({ player_id: id, tier: 1, points: 10 })),
      ...selected[2].map(id => ({ player_id: id, tier: 2, points: 6 })),
      ...selected[3].map(id => ({ player_id: id, tier: 3, points: 3 })),
    ]

    const res = await fetch('/api/admin/contribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week.id, contributions }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      setSaving(false)
      return
    }

    onSaved()
  }

  const tierColors: Record<number, string> = {
    1: 'border-amber-400 bg-amber-400/10 text-amber-400',
    2: 'border-slate-400 bg-slate-400/10 text-slate-300',
    3: 'border-orange-600 bg-orange-600/10 text-orange-400',
  }

  const availablePlayers = players.filter(p =>
    step === 1
      ? !selected[2].includes(p.id) && !selected[3].includes(p.id)
      : step === 2
      ? !selected[1].includes(p.id) && !selected[3].includes(p.id)
      : !selected[1].includes(p.id) && !selected[2].includes(p.id)
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🤝 {t.contribution}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Steps */}
        <div className="flex gap-2 mb-5">
          {TIER_CONFIG.map(tc => (
            <button
              key={tc.tier}
              onClick={() => setStep(tc.tier)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                step === tc.tier
                  ? tierColors[tc.tier]
                  : 'border-slate-700 text-slate-500 bg-slate-800'
              }`}
            >
              <div>{t.step} {tc.tier}</div>
              <div className="text-xs font-bold">+{tc.points} pts</div>
              <div className="text-xs mt-0.5">{selected[tc.tier].length}/10</div>
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-300 mb-3">
          {currentStep.label(t)}
          <span className="ml-2 text-slate-500">
            {lang === 'fr'
              ? `Sélectionnez exactement 10 joueurs (${selected[step].length}/10)`
              : `Select exactly 10 players (${selected[step].length}/10)`
            }
          </span>
        </p>

        {/* Player selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-1">
          {availablePlayers.map(player => {
            const isSelected = selected[step].includes(player.id)
            const isInOtherTier = allSelected.has(player.id) && !selected[step].includes(player.id)

            return (
              <button
                key={player.id}
                onClick={() => !isInOtherTier && togglePlayer(player.id)}
                disabled={isInOtherTier}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                  isInOtherTier
                    ? 'border-slate-700 text-slate-600 cursor-not-allowed opacity-40'
                    : isSelected
                    ? tierColors[step]
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 bg-slate-800'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                  isSelected ? 'bg-current border-current text-black' : 'border-slate-600'
                }`}>
                  {isSelected ? '✓' : ''}
                </span>
                <span className="text-sm truncate">{player.display_name}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} className="btn-secondary text-sm">
                ← {lang === 'fr' ? 'Précédent' : 'Previous'}
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
                className="btn-secondary text-sm"
                disabled={!canProceed()}
              >
                {lang === 'fr' ? 'Suivant' : 'Next'} → {!canProceed() && `(${selected[step].length}/10)`}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">{t.cancel}</button>
            {step === 3 && (
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={saving || !canProceed()}
              >
                {saving ? t.loading : t.confirm}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
