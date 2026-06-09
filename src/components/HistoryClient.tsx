'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSLATIONS, Lang, getRankColor } from '@/lib/utils'
import type { Profile, Week, Player, WeeklyRanking } from '@/types'
import Navbar from './Navbar'
import ProfileModal from './ProfileModal'

interface Props {
  profile: Profile | null
  weeks: Week[]
  players: Player[]
  rankings: Record<string, WeeklyRanking[]>
}

export default function HistoryClient({ profile, weeks, players, rankings }: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weeks[0]?.id || '')
  const [showProfile, setShowProfile] = useState(false)
  const t = TRANSLATIONS[lang]

  const currentPlayer = players.find(p => p.id === profile?.player_id) ?? null
  const selectedRankings = selectedWeekId ? (rankings[selectedWeekId] || []) : []
  const selectedWeek = weeks.find(w => w.id === selectedWeekId)

  return (
    <div className="min-h-screen">
      <Navbar
        lang={lang}
        setLang={setLang}
        isAdmin={profile?.role === 'admin'}
        playerName={currentPlayer?.display_name}
        onProfile={() => setShowProfile(true)}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <button onClick={() => router.back()} className="btn-secondary text-sm">
            ← {lang === 'fr' ? 'Retour' : 'Back'}
          </button>
        </div>

        <h1 className="lw-title text-2xl mb-6">📚 {t.weekHistory}</h1>

        {weeks.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-400">{t.noHistory}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Week dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-slate-400 text-sm whitespace-nowrap">
                {lang === 'fr' ? 'Semaine :' : 'Week:'}
              </label>
              <select
                value={selectedWeekId}
                onChange={e => setSelectedWeekId(e.target.value)}
                className="input-field max-w-xs"
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>
                    S{w.week_number} · {new Date(w.start_date + 'T00:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' })} → {new Date(w.end_date + 'T00:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' })} · {w.type === 'push' ? (lang === 'fr' ? 'Push' : 'Push') : 'Éco'}
                  </option>
                ))}
              </select>
            </div>

            {/* Rankings table */}
            <div className="card overflow-hidden">
              {selectedWeek && (
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
                  <h2 className="text-white font-semibold">
                    {t.weekNumber} {selectedWeek.week_number} · {selectedWeek.year}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    selectedWeek.type === 'push'
                      ? 'bg-yellow-400/10 border-yellow-500/30 text-yellow-400'
                      : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                  }`}>
                    {selectedWeek.type === 'push' ? t.pushWeek : t.ecoWeek}
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="table-th w-12">{t.rank}</th>
                      <th className="table-th">{t.player}</th>
                      <th className="table-th-center" style={{ color: 'var(--gold)' }}>{t.total}</th>
                      <th className="table-th-center">{lang === 'fr' ? 'Base suiv.' : 'Next base'}</th>
                      <th className="table-th-center">{t.role}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRankings.map(r => {
                      const player = players.find(p => p.id === r.player_id)
                      return (
                        <tr key={r.id} className="border-b border-slate-700/50 table-row-hover">
                          <td className="px-4 py-3">
                            <span className={`font-bold ${getRankColor(r.rank)}`}>
                              {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">{player?.display_name || '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-white">{r.total_points}</td>
                          <td className="px-4 py-3 text-center text-amber-400">{r.base_score_next_week}</td>
                          <td className="px-4 py-3 text-center">
                            {r.role === 'pilot' && <span className="badge-pilot">{t.pilot}</span>}
                            {r.role === 'vip' && <span className="badge-vip">{t.vip}</span>}
                            {!r.role && <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                    {selectedRankings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          {t.loading}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

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
