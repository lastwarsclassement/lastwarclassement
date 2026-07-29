'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSLATIONS, Lang, getRankColor, getRankBg, getLocale } from '@/lib/utils'
import { getBirthdaysInRange, getWeekDates, getNextBirthdayDate, computeContributionPoints } from '@/lib/scoring'
import type { Player, Profile, Week, DailyScore, Sanction, WeeklyRanking, PlayerRole, DayType, WeekType } from '@/types'
import ScoreEntryModal from './ScoreEntryModal'
import SanctionModal from './SanctionModal'
import WeekValidationModal from './WeekValidationModal'
import ProfileModal from './ProfileModal'
import Navbar from './Navbar'

interface Props {
  currentUser: { id: string; email?: string }
  profile: Profile | null
  players: Player[]
  activeWeek: Week | null
  dailyScores: DailyScore[]
  sanctions: Sanction[]
  baseScores: { player_id: string; base_score: number; week_id: string }[]
  weekRankings: WeeklyRanking[]
}

interface PlayerRow {
  player: Player
  baseScore: number
  dailyBreakdown: Record<string, number>
  dailyPoints: number
  contributionPoints: number
  sanctionPoints: number
  totalPoints: number
  rank: number
  role: PlayerRole
  hasBirthdayNextWeek: boolean
}

export default function DashboardClient({
  currentUser, profile, players, activeWeek,
  dailyScores, sanctions, baseScores, weekRankings,
}: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const t = TRANSLATIONS[lang]
  const isAdmin = profile?.role === 'admin'

  const [showScoreEntry, setShowScoreEntry] = useState(false)
  const [showSanction, setShowSanction] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [weekTypeLoading, setWeekTypeLoading] = useState(false)
  const [weekTypeError, setWeekTypeError] = useState('')
  const [startingWeek, setStartingWeek] = useState(false)

  const currentPlayer = players.find(p => p.id === profile?.player_id) ?? null

  // Next week date range (UTC)
  const [nextWeekStart, nextWeekEnd] = useMemo(() => {
    if (!activeWeek) return [new Date(), new Date()]
    const end = new Date(activeWeek.end_date + 'T00:00:00Z')
    const s = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1))
    const e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + 6))
    return [s, e]
  }, [activeWeek])

  // Birthdays in next week
  const birthdaysNextWeek = useMemo(() =>
    getBirthdaysInRange(players, nextWeekStart, nextWeekEnd),
    [players, nextWeekStart, nextWeekEnd]
  )

  // Auto-compute contribution points from Sunday scores
  const contribMap = useMemo(() => {
    if (!activeWeek) return new Map<string, number>()
    const sundayDate = activeWeek.end_date
    const sundayScores = dailyScores
      .filter(ds => ds.score_date === sundayDate)
      .map(ds => ({ player_id: ds.player_id, contribution_score: ds.contribution_score }))
    return computeContributionPoints(sundayScores)
  }, [activeWeek, dailyScores])

  // Compute leaderboard rows
  const rows: PlayerRow[] = useMemo(() => {
    if (!activeWeek) return []
    const birthdayNextWeek = birthdaysNextWeek

    return players.map(player => {
      const base = baseScores.find(b => b.player_id === player.id)?.base_score ?? 0
      const playerDailyScores = dailyScores.filter(ds => ds.player_id === player.id)
      const dailyBreakdown: Record<string, number> = {}
      let daily = 0
      for (const ds of playerDailyScores) {
        dailyBreakdown[ds.score_date] = ds.points_earned
        daily += ds.points_earned
      }
      const contrib = contribMap.get(player.id) ?? 0
      const sanction = sanctions
        .filter(s => s.player_id === player.id)
        .reduce((sum, s) => sum + s.points, 0)
      const total = base + daily + contrib + sanction

      return {
        player,
        baseScore: base,
        dailyBreakdown,
        dailyPoints: daily,
        contributionPoints: contrib,
        sanctionPoints: sanction,
        totalPoints: total,
        rank: 0,
        role: null,
        hasBirthdayNextWeek: birthdayNextWeek.includes(player.id),
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, i) => ({
      ...row,
      rank: i + 1,
    }))
  }, [players, activeWeek, dailyScores, contribMap, sanctions, baseScores])

  // Merge with validated rankings if week is validated
  const displayRows: PlayerRow[] = useMemo(() => {
    if (activeWeek?.status !== 'validated' || weekRankings.length === 0) return rows

    return rows.map(row => {
      const wr = weekRankings.find(r => r.player_id === row.player.id)
      return wr ? { ...row, role: wr.role as PlayerRole } : row
    })
  }, [rows, activeWeek, weekRankings])

  // Week days Mon-Sat for column headers
  const weekDays = useMemo(() => {
    if (!activeWeek) return []
    const start = new Date(activeWeek.start_date + 'T00:00:00Z')
    return Array.from({ length: 6 }, (_, i) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
        .toISOString().split('T')[0]
    )
  }, [activeWeek])

  // Per-day type: frozen dates win, otherwise inferred from stored week_type in daily_scores
  const dayTypes = useMemo(() => {
    const types: Record<string, DayType> = {}
    for (const day of weekDays) {
      if (activeWeek?.frozen_dates?.includes(day)) {
        types[day] = 'gel'
        continue
      }
      const scoreWithType = dailyScores.find(ds => ds.score_date === day && ds.week_type != null)
      types[day] = (scoreWithType?.week_type as DayType) ?? (activeWeek?.type ?? 'push')
    }
    return types
  }, [weekDays, dailyScores, activeWeek])

  const dayLabels = lang === 'fr'
    ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


  async function handleChangeWeekType(newType: WeekType) {
    if (!activeWeek || !isAdmin || newType === activeWeek.type) return
    setWeekTypeLoading(true)
    setWeekTypeError('')
    const res = await fetch('/api/admin/week', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: activeWeek.id, type: newType }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setWeekTypeError(data?.error || t.error)
    }
    setWeekTypeLoading(false)
    router.refresh()
  }

  async function handleStartWeek() {
    if (!isAdmin) return
    setStartingWeek(true)
    await fetch('/api/admin/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds: players.map(p => p.id) }),
    })
    setStartingWeek(false)
    router.refresh()
  }

  async function handleReopenWeek() {
    if (!activeWeek || !isAdmin) return
    await fetch('/api/admin/week', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: activeWeek.id, status: 'active' }),
    })
    router.refresh()
  }

  async function handleDeleteWeek() {
    if (!activeWeek || !isAdmin) return
    const msg = lang === 'fr'
      ? `Supprimer la semaine ${activeWeek.week_number} et toutes ses données ? Cette action est irréversible.`
      : `Delete week ${activeWeek.week_number} and all its data? This cannot be undone.`
    if (!confirm(msg)) return
    await fetch('/api/admin/week', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: activeWeek.id }),
    })
    router.refresh()
  }

  const getScoreColor = (points: number) => {
    if (points > 0) return 'positive'
    if (points < 0) return 'negative'
    return 'text-slate-400'
  }

  const RankCell = ({ rank }: { rank: number }) => {
    if (rank <= 3) return <span className={`rank-badge rank-${rank}`}>{rank}</span>
    return <span className="rank-other">#{rank}</span>
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
        {/* Header row */}
        <div className="mb-6">
          {/* Title + week type */}
          <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
            <div>
              <h1 className="lw-title text-2xl">🏆 {t.dashboard}</h1>
              {activeWeek ? (
                <>
                  <p className={`text-xl font-bold mt-1 ${activeWeek.type === 'push' ? 'text-amber-400' : activeWeek.type === 'eco' ? 'text-emerald-400' : 'text-violet-400'}`}>
                    {activeWeek.type === 'push' ? t.pushWeek : activeWeek.type === 'eco' ? t.ecoWeek : t.pushControlWeek} S{activeWeek.week_number}
                    {activeWeek.status === 'validated' && (
                      <span className="ml-3 text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full align-middle">
                        ✓ {t.weekValidated}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {new Date(activeWeek.start_date).toLocaleDateString(getLocale(lang))} → {new Date(activeWeek.end_date).toLocaleDateString(getLocale(lang))}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-sm mt-1">{t.noActiveWeek}</p>
              )}
            </div>

          </div>

          {/* Admin action buttons */}
          {isAdmin && activeWeek && (
            <div className="flex flex-col gap-2">
              {/* Row 1 : week type selector */}
              {activeWeek.status === 'active' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{t.weekType}</span>
                  <select
                    data-tutorial="toggle-week-type"
                    value={activeWeek.type}
                    onChange={e => handleChangeWeekType(e.target.value as WeekType)}
                    disabled={weekTypeLoading}
                    className="text-xs font-semibold"
                    style={{
                      width: 'auto',
                      padding: '4px 8px',
                      background: '#091830',
                      border: '1px solid #2A4F8A',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: activeWeek.type === 'push' ? '#FFB800' : activeWeek.type === 'eco' ? '#34D399' : '#A78BFA',
                    }}
                  >
                    <option value="push">🟡 {t.pushWeek}</option>
                    <option value="eco">🟢 {t.ecoWeek}</option>
                    <option value="push_control">🟣 {t.pushControlWeek}</option>
                  </select>
                  {weekTypeError && (
                    <span className="text-xs text-red-400">{weekTypeError}</span>
                  )}
                </div>
              )}

              {/* Row 2 : score actions */}
              <div className="flex flex-wrap gap-2">
                {activeWeek.status === 'active' && (
                  <>
                    <button data-tutorial="enter-scores-btn" onClick={() => setShowScoreEntry(true)} className="btn-primary text-sm">
                      📊 {t.enterScores}
                    </button>
                    <button data-tutorial="sanctions-btn" onClick={() => setShowSanction(true)} className="btn-secondary text-sm">
                      ⚠️ {t.sanctions}
                    </button>
                    <button data-tutorial="validate-btn" onClick={() => setShowValidation(true)} className="btn-primary text-sm">
                      ✅ {t.validateWeek}
                    </button>
                    <button onClick={handleDeleteWeek} className="btn-danger text-sm">
                      🗑 {lang === 'fr' ? 'Supprimer' : 'Delete'}
                    </button>
                  </>
                )}
                {activeWeek.status === 'validated' && (
                  <button data-tutorial="reopen-btn" onClick={handleReopenWeek} className="btn-secondary text-sm">
                    🔓 {t.reopenWeek}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Birthdays next week */}
        {birthdaysNextWeek.length > 0 && (
          <div className="mb-4 bg-pink-500/10 border border-pink-500/20 rounded-lg px-4 py-2 text-pink-300 text-sm">
            <span className="font-medium">🎂 {birthdaysNextWeek.length} {t.birthdayNote}</span>
            <span className="ml-2">
              {birthdaysNextWeek.map(id => {
                const p = players.find(pl => pl.id === id)
                if (!p) return null
                const bd = getNextBirthdayDate(p.birth_date, nextWeekStart)
                const day = String(bd.getUTCDate()).padStart(2, '0')
                const month = String(bd.getUTCMonth() + 1).padStart(2, '0')
                return `${p.display_name} (${day}/${month})`
              }).filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {/* No active week */}
        {!activeWeek && (
          <div className="card p-16 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(255,184,0,0.08) 0%, transparent 60%), linear-gradient(135deg, #1E3F6F 0%, #132D52 100%)' }}>
            <div className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 0 16px rgba(255,184,0,0.3))' }}>🏆</div>
            <h2 className="mb-2" style={{ fontFamily: 'var(--font-heading), Oswald, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A8C4E8', fontSize: '1.3rem' }}>
              {lang === 'fr' ? 'Aucune semaine en cours' : 'No active week'}
            </h2>
            <p className="mb-8" style={{ color: '#5B7FA8', fontFamily: 'var(--font-body), Nunito, sans-serif' }}>
              {lang === 'fr' ? 'Démarrez une nouvelle semaine pour voir le classement' : 'Start a new week to display the leaderboard'}
            </p>
            {isAdmin && (
              <button data-tutorial="start-week-btn" onClick={handleStartWeek} className="btn-primary" style={{ fontSize: '1rem', padding: '12px 36px' }} disabled={startingWeek}>
                {startingWeek ? t.loading : `▶ ${t.startWeek}`}
              </button>
            )}
          </div>
        )}

        {/* Leaderboard table */}
        {(activeWeek || displayRows.length > 0) && (
          <div data-tutorial="leaderboard-table" className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-th w-12">{t.rank}</th>
                    <th className="table-th">{t.player}</th>
                    {weekDays.map((day, i) => (
                      <th key={i} className="table-th-center w-12">
                        <div>{dayLabels[i]}</div>
                        <div style={{ fontSize: '0.5rem', letterSpacing: '0.02em', opacity: 0.45, color: dayTypes[day] === 'push' ? '#FFB800' : dayTypes[day] === 'eco' ? '#34D399' : dayTypes[day] === 'push_control' ? '#A78BFA' : '#7DD3FC' }}>
                          {dayTypes[day] === 'push' ? 'P' : dayTypes[day] === 'eco' ? 'É' : dayTypes[day] === 'push_control' ? 'C' : '🧊'}
                        </div>
                      </th>
                    ))}
                    <th className="table-th-center">{t.contribPts}</th>
                    <th className="table-th-center">{t.sanctionPts}</th>
                    <th className="table-th-center" style={{ color: 'var(--gold)' }}>{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => {
                    const isCurrentUser = profile?.player_id === row.player.id
                    return (
                      <tr
                        key={row.player.id}
                        className={`border-b border-slate-700/50 table-row-hover transition-colors ${
                          isCurrentUser ? 'bg-amber-400/5' : ''
                        } ${getRankBg(row.rank)}`}
                      >
                        <td className="px-4 py-3">
                          <RankCell rank={row.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${isCurrentUser ? 'text-amber-400' : 'text-white'}`}>
                              {row.player.display_name}
                            </span>
                            {row.role === 'pilot' && <span className="badge-pilot">{t.pilot}</span>}
                            {row.role === 'vip' && <span className="badge-vip">{t.vip}</span>}
                            {row.hasBirthdayNextWeek && <span className="badge-birthday">🎂</span>}
                          </div>
                        </td>
                        {weekDays.map(date => {
                          const pts = row.dailyBreakdown[date]
                          return (
                            <td key={date} className="px-2 py-3 text-center">
                              {pts !== undefined
                                ? <span className={`font-medium ${getScoreColor(pts)}`}>
                                    {pts > 0 ? `+${pts}` : pts}
                                  </span>
                                : <span className="text-slate-700">—</span>
                              }
                            </td>
                          )
                        })}
                        <td className={`px-2 py-3 text-center font-medium ${getScoreColor(row.contributionPoints)}`}>
                          {row.contributionPoints > 0 ? `+${row.contributionPoints}` : row.contributionPoints || '—'}
                        </td>
                        <td className={`px-2 py-3 text-center font-medium ${getScoreColor(row.sanctionPoints)}`}>
                          {row.sanctionPoints < 0 ? row.sanctionPoints : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-lg font-bold ${row.rank === 1 ? 'rank-gold' : row.rank === 2 ? 'rank-silver' : row.rank === 3 ? 'rank-bronze' : 'text-white'}`}>
                            {row.totalPoints}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {displayRows.length === 0 && activeWeek && (
                    <tr>
                      <td colSpan={2 + weekDays.length + 3} className="px-4 py-12 text-center text-slate-500">
                        {t.loading}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {displayRows.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-700/50 text-xs text-slate-500">
                {players.length} {lang === 'fr' ? 'joueurs' : 'players'}
                {activeWeek && ` · ${activeWeek.type === 'push' ? t.pushWeek : activeWeek.type === 'eco' ? t.ecoWeek : t.pushControlWeek}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showScoreEntry && activeWeek && (
        <ScoreEntryModal
          players={players}
          week={activeWeek}
          existingScores={dailyScores}
          lang={lang}
          onClose={() => setShowScoreEntry(false)}
          onSaved={() => { setShowScoreEntry(false); router.refresh() }}
          onRefresh={() => router.refresh()}
        />
      )}

      {showSanction && activeWeek && (
        <SanctionModal
          players={players}
          week={activeWeek}
          existingSanctions={sanctions}
          lang={lang}
          onClose={() => setShowSanction(false)}
          onSaved={() => { setShowSanction(false); router.refresh() }}
        />
      )}

      {showValidation && activeWeek && (
        <WeekValidationModal
          players={players}
          week={activeWeek}
          rows={displayRows}
          lang={lang}
          onClose={() => setShowValidation(false)}
          onSaved={() => { setShowValidation(false); router.refresh() }}
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
