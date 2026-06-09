'use client'

import { useState, useMemo } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import { getBirthdaysInRange, getNextBirthdayDate } from '@/lib/scoring'
import type { Player, Week, PlayerRole } from '@/types'

interface PlayerRow {
  player: Player
  totalPoints: number
  rank: number
  role: PlayerRole
  hasBirthdayNextWeek: boolean
}

interface Props {
  players: Player[]
  week: Week
  rows: PlayerRow[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function WeekValidationModal({ players, week, rows, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Compute next week's date range (UTC)
  const nextWeekStart = useMemo(() => {
    const d = new Date(week.end_date + 'T00:00:00Z')
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
  }, [week])

  const nextWeekEnd = useMemo(() => {
    return new Date(Date.UTC(nextWeekStart.getUTCFullYear(), nextWeekStart.getUTCMonth(), nextWeekStart.getUTCDate() + 6))
  }, [nextWeekStart])

  const birthdayPlayerIds = useMemo(() =>
    getBirthdaysInRange(players, nextWeekStart, nextWeekEnd),
    [players, nextWeekStart, nextWeekEnd]
  )

  const birthdayPlayers = players.filter(p => birthdayPlayerIds.includes(p.id))

  // Determine roles
  const assignments = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.totalPoints - a.totalPoints)

    const pilots: string[] = []
    const vips: string[] = []
    const birthdayVips: string[] = []

    // Birthday players go to VIP (if not already pilot)
    for (const p of sorted) {
      if (birthdayPlayerIds.includes(p.player.id)) {
        if (pilots.length < 7 && !vips.includes(p.player.id) && !birthdayVips.includes(p.player.id)) {
          // Check if this person would be in top 7
          const rank = sorted.findIndex(r => r.player.id === p.player.id)
          if (rank < 7) {
            // Top 7 AND birthday → pilot AND vip (-60 pts)
            pilots.push(p.player.id)
            birthdayVips.push(p.player.id)
          } else {
            birthdayVips.push(p.player.id)
          }
        }
      }
    }

    // Fill remaining pilot spots (top 7 not already birthday-vip unless also pilot)
    for (const p of sorted) {
      if (pilots.length >= 7) break
      if (!pilots.includes(p.player.id)) {
        pilots.push(p.player.id)
      }
    }

    // Available VIP spots = 7 - birthday VIPs that are NOT also pilots
    const birthdayOnlyVips = birthdayVips.filter(id => !pilots.includes(id))
    const availableVipSpots = 7 - birthdayOnlyVips.length

    // Fill remaining VIP spots
    let vipFilled = 0
    for (const p of sorted) {
      if (vipFilled >= availableVipSpots) break
      if (!pilots.includes(p.player.id) && !birthdayOnlyVips.includes(p.player.id)) {
        vips.push(p.player.id)
        vipFilled++
      }
    }

    return { pilots, vips: [...vips, ...birthdayOnlyVips], birthdayBothRoles: birthdayVips.filter(id => pilots.includes(id)) }
  }, [rows, birthdayPlayerIds])

  const { pilots, vips, birthdayBothRoles } = assignments

  function getRole(playerId: string): PlayerRole {
    if (pilots.includes(playerId) && vips.includes(playerId)) return 'pilot' // counted as pilot primarily
    if (pilots.includes(playerId)) return 'pilot'
    if (vips.includes(playerId)) return 'vip'
    return null
  }

  function getBaseScoreNextWeek(playerId: string, totalPoints: number): number {
    if (pilots.includes(playerId) || vips.includes(playerId)) return 0
    return totalPoints
  }

  async function handleValidate() {
    setSaving(true)
    setError('')

    const rankings = rows.map(row => ({
      player_id: row.player.id,
      rank: row.rank,
      total_points: row.totalPoints,
      role: getRole(row.player.id),
      base_score_next_week: getBaseScoreNextWeek(row.player.id, row.totalPoints),
    }))

    const res = await fetch('/api/admin/validate-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: week.id, rankings }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      setSaving(false)
      return
    }

    onSaved()
  }

  const vipSpots = 7 - birthdayBothRoles.length === 7
    ? 7 - birthdayPlayers.filter(p => !pilots.includes(p.id)).length
    : 7

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">✅ {t.validateWeek}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Birthday info */}
        {birthdayPlayers.length > 0 && (
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 mb-4 text-sm">
            <p className="text-pink-300 font-medium mb-1">
              🎂 {birthdayPlayers.length} {t.birthdayNote}
            </p>
            <p className="text-pink-400 text-xs">
              {birthdayPlayers.map(p => {
                const bd = getNextBirthdayDate(p.birth_date, nextWeekStart)
                const day = String(bd.getUTCDate()).padStart(2, '0')
                const month = String(bd.getUTCMonth() + 1).padStart(2, '0')
                return `${p.display_name} (${day}/${month})`
              }).join(', ')}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {lang === 'fr'
                ? `Places VIP disponibles au classement : ${vipSpots} (sur 7)`
                : `Available ranked VIP spots: ${vipSpots} (out of 7)`
              }
            </p>
          </div>
        )}

        {/* Role summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
            <p className="text-amber-400 font-semibold text-sm mb-2">⚙️ {t.pilot} (7)</p>
            {pilots.map(id => {
              const p = players.find(pl => pl.id === id)
              const isBirthday = birthdayBothRoles.includes(id)
              return p ? (
                <div key={id} className="text-xs text-slate-300 flex items-center gap-1 mb-0.5">
                  <span>{p.display_name}</span>
                  {isBirthday && <span className="text-pink-400">🎂</span>}
                  <span className="text-amber-600">→ 0</span>
                </div>
              ) : null
            })}
          </div>
          <div className="bg-purple-400/10 border border-purple-400/20 rounded-lg p-3">
            <p className="text-purple-400 font-semibold text-sm mb-2">
              ⭐ {t.vip} ({vips.length})
            </p>
            {vips.map(id => {
              const p = players.find(pl => pl.id === id)
              const isBirthday = birthdayPlayerIds.includes(id)
              return p ? (
                <div key={id} className="text-xs text-slate-300 flex items-center gap-1 mb-0.5">
                  <span>{p.display_name}</span>
                  {isBirthday && <span className="text-pink-400">🎂</span>}
                  <span className="text-purple-600">→ 0</span>
                </div>
              ) : null
            })}
          </div>
        </div>

        {/* Top 10 preview */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">
            {lang === 'fr' ? 'Aperçu du classement final (top 15)' : 'Final ranking preview (top 15)'}
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {rows.slice(0, 15).map(row => {
              const role = getRole(row.player.id)
              const nextBase = getBaseScoreNextWeek(row.player.id, row.totalPoints)
              const resetsToZero = nextBase === 0 && row.totalPoints !== 0
              return (
                <div key={row.player.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-800/50">
                  <span className="text-slate-500 w-5 text-right">{row.rank}</span>
                  <span className="text-white flex-1">{row.player.display_name}</span>
                  {role === 'pilot' && <span className="badge-pilot">{lang === 'fr' ? 'Pilote' : 'Pilot'}</span>}
                  {role === 'vip' && <span className="badge-vip">VIP</span>}
                  <span className="text-slate-300 font-medium">{row.totalPoints}</span>
                  {resetsToZero && <span className="text-red-400">→ 0</span>}
                  {!resetsToZero && <span className="text-amber-400 font-medium">→ {nextBase}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-xs text-slate-400">
          {lang === 'fr'
            ? '⚠️ La validation est définitive. Utilisez le bouton "Rouvrir" si une correction est nécessaire après validation.'
            : '⚠️ Validation is permanent. Use the "Reopen" button if corrections are needed after validation.'
          }
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">{t.cancel}</button>
          <button onClick={handleValidate} className="btn-primary" disabled={saving}>
            {saving ? t.loading : `✅ ${t.confirm}`}
          </button>
        </div>
      </div>
    </div>
  )
}
