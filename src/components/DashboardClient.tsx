'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TRANSLATIONS, Lang, getRankColor, getRankBg } from '@/lib/utils'
import { getBirthdaysInRange, getWeekDates } from '@/lib/scoring'
import type { Player, Profile, Week, DailyScore, WeeklyContribution, Sanction, WeeklyRanking, PlayerRole } from '@/types'
import ScoreEntryModal from './ScoreEntryModal'
import AllianceContributionModal from './AllianceContributionModal'
import SanctionModal from './SanctionModal'
import WeekValidationModal from './WeekValidationModal'
import CreateUserModal from './CreateUserModal'

interface Props {
  currentUser: { id: string; email?: string }
  profile: Profile | null
  players: Player[]
  activeWeek: Week | null
  dailyScores: DailyScore[]
  contributions: WeeklyContribution[]
  sanctions: Sanction[]
  baseScores: { player_id: string; base_score: number; week_id: string }[]
  weekRankings: WeeklyRanking[]
}

interface PlayerRow {
  player: Player
  baseScore: number
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
  dailyScores, contributions, sanctions, baseScores, weekRankings,
}: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const t = TRANSLATIONS[lang]
  const isAdmin = profile?.role === 'admin'

  const [showScoreEntry, setShowScoreEntry] = useState(false)
  const [showContribution, setShowContribution] = useState(false)
  const [showSanction, setShowSanction] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [weekTypeLoading, setWeekTypeLoading] = useState(false)
  const [startingWeek, setStartingWeek] = useState(false)

  // Compute leaderboard rows
  const rows: PlayerRow[] = useMemo(() => {
    if (!activeWeek) return []

    const nextWeekStart = activeWeek ? new Date(activeWeek.end_date) : new Date()
    nextWeekStart.setDate(nextWeekStart.getDate() + 1)
    const nextWeekEnd = new Date(nextWeekStart)
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
    const birthdayNextWeek = getBirthdaysInRange(players, nextWeekStart, nextWeekEnd)

    return players.map(player => {
      const base = baseScores.find(b => b.player_id === player.id)?.base_score ?? 0
      const daily = dailyScores
        .filter(ds => ds.player_id === player.id)
        .reduce((sum, ds) => sum + ds.points_earned, 0)
      const contrib = contributions
        .filter(c => c.player_id === player.id)
        .reduce((sum, c) => sum + c.points, 0)
      const sanction = sanctions
        .filter(s => s.player_id === player.id)
        .reduce((sum, s) => sum + s.points, 0)
      const total = base + daily + contrib + sanction

      return {
        player,
        baseScore: base,
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
  }, [players, activeWeek, dailyScores, contributions, sanctions, baseScores])

  // Merge with validated rankings if week is validated
  const displayRows: PlayerRow[] = useMemo(() => {
    if (activeWeek?.status !== 'validated' || weekRankings.length === 0) return rows

    return rows.map(row => {
      const wr = weekRankings.find(r => r.player_id === row.player.id)
      return wr ? { ...row, role: wr.role as PlayerRole } : row
    })
  }, [rows, activeWeek, weekRankings])

  // Birthday info for current week validation
  const birthdaysThisWeek = useMemo(() => {
    if (!activeWeek) return []
    const start = new Date(activeWeek.start_date)
    const end = new Date(activeWeek.end_date)
    return getBirthdaysInRange(players, start, end)
  }, [players, activeWeek])

  async function handleToggleWeekType() {
    if (!activeWeek || !isAdmin) return
    setWeekTypeLoading(true)
    const newType = activeWeek.type === 'push' ? 'eco' : 'push'
    await fetch('/api/admin/week', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: activeWeek.id, type: newType }),
    })
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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

  const getScoreColor = (points: number) => {
    if (points > 0) return 'positive'
    if (points < 0) return 'negative'
    return 'text-slate-400'
  }

  const getRankLabel = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center text-sm">⚔️</div>
            <span className="font-bold text-white text-lg hidden sm:block">{t.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Week badge */}
            {activeWeek && (
              <span className={`text-xs px-2 py-1 rounded-full border font-medium hidden md:block ${
                activeWeek.type === 'push'
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
              }`}>
                {activeWeek.type === 'push' ? t.pushWeek : t.ecoWeek} — S{activeWeek.week_number}
              </span>
            )}

            {/* Nav links */}
            <a href="/dashboard" className="text-sm text-slate-300 hover:text-amber-400 px-3 py-1 transition-colors">
              {t.dashboard}
            </a>
            <a href="/dashboard/history" className="text-sm text-slate-300 hover:text-amber-400 px-3 py-1 transition-colors">
              {t.history}
            </a>

            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="text-xs text-slate-400 hover:text-amber-400 border border-slate-700 rounded-full px-2 py-1"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>

            <button onClick={handleLogout} className="btn-secondary text-sm py-1 px-3">
              {t.logout}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header row */}
        <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t.dashboard}</h1>
            {activeWeek ? (
              <p className="text-slate-400 text-sm mt-0.5">
                {t.weekNumber} {activeWeek.week_number} — {new Date(activeWeek.start_date).toLocaleDateString('fr-FR')} → {new Date(activeWeek.end_date).toLocaleDateString('fr-FR')}
                {activeWeek.status === 'validated' && (
                  <span className="ml-2 text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">
                    ✓ {t.weekValidated}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-slate-500 text-sm">{t.noActiveWeek}</p>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {!activeWeek && (
                <button onClick={handleStartWeek} className="btn-primary text-sm" disabled={startingWeek}>
                  {startingWeek ? t.loading : `▶ ${t.startWeek}`}
                </button>
              )}

              {activeWeek && activeWeek.status === 'active' && (
                <>
                  <button
                    onClick={handleToggleWeekType}
                    disabled={weekTypeLoading}
                    className="btn-secondary text-sm"
                  >
                    {weekTypeLoading ? '...' : activeWeek.type === 'push' ? `→ ${t.ecoWeek}` : `→ ${t.pushWeek}`}
                  </button>
                  <button onClick={() => setShowScoreEntry(true)} className="btn-primary text-sm">
                    📊 {t.enterScores}
                  </button>
                  <button onClick={() => setShowContribution(true)} className="btn-secondary text-sm">
                    🤝 {t.contribution}
                  </button>
                  <button onClick={() => setShowSanction(true)} className="btn-secondary text-sm">
                    ⚠️ {t.sanctions}
                  </button>
                  <button onClick={() => setShowValidation(true)} className="btn-primary text-sm">
                    ✅ {t.validateWeek}
                  </button>
                </>
              )}

              {activeWeek && activeWeek.status === 'validated' && (
                <button onClick={handleReopenWeek} className="btn-secondary text-sm">
                  🔓 {t.reopenWeek}
                </button>
              )}

              <button onClick={() => setShowCreateUser(true)} className="btn-secondary text-sm">
                👤 {t.createUser}
              </button>
            </div>
          )}
        </div>

        {/* Birthdays this week */}
        {birthdaysThisWeek.length > 0 && (
          <div className="mb-4 bg-pink-500/10 border border-pink-500/20 rounded-lg px-4 py-2 flex items-center gap-2 text-pink-300 text-sm">
            🎂 {birthdaysThisWeek.length} {t.birthdayNote}:{' '}
            {birthdaysThisWeek.map(id => players.find(p => p.id === id)?.display_name).filter(Boolean).join(', ')}
          </div>
        )}

        {/* No active week + not admin */}
        {!activeWeek && !isAdmin && (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">⚔️</div>
            <p className="text-slate-400">{t.noActiveWeek}</p>
          </div>
        )}

        {/* Leaderboard table */}
        {(activeWeek || displayRows.length > 0) && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium w-12">{t.rank}</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">{t.player}</th>
                    <th className="text-center px-3 py-3 text-slate-400 font-medium">{t.baseScore}</th>
                    <th className="text-center px-3 py-3 text-slate-400 font-medium">{t.dailyPts}</th>
                    <th className="text-center px-3 py-3 text-slate-400 font-medium">{t.contribPts}</th>
                    <th className="text-center px-3 py-3 text-slate-400 font-medium">{t.sanctionPts}</th>
                    <th className="text-center px-4 py-3 text-white font-semibold">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const isCurrentUser = profile?.player_id === row.player.id
                    return (
                      <tr
                        key={row.player.id}
                        className={`border-b border-slate-700/50 table-row-hover transition-colors ${
                          isCurrentUser ? 'bg-amber-400/5' : ''
                        } ${getRankBg(row.rank)}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-bold text-base ${getRankColor(row.rank)}`}>
                            {getRankLabel(row.rank)}
                          </span>
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
                        <td className="px-3 py-3 text-center text-slate-300">{row.baseScore}</td>
                        <td className={`px-3 py-3 text-center font-medium ${getScoreColor(row.dailyPoints)}`}>
                          {row.dailyPoints > 0 ? `+${row.dailyPoints}` : row.dailyPoints}
                        </td>
                        <td className={`px-3 py-3 text-center font-medium ${getScoreColor(row.contributionPoints)}`}>
                          {row.contributionPoints > 0 ? `+${row.contributionPoints}` : row.contributionPoints || '—'}
                        </td>
                        <td className={`px-3 py-3 text-center font-medium ${getScoreColor(row.sanctionPoints)}`}>
                          {row.sanctionPoints < 0 ? row.sanctionPoints : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-lg font-bold ${row.rank <= 3 ? getRankColor(row.rank) : 'text-white'}`}>
                            {row.totalPoints}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {displayRows.length === 0 && activeWeek && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
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
                {activeWeek && ` · ${activeWeek.type === 'push' ? t.pushWeek : t.ecoWeek}`}
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
        />
      )}

      {showContribution && activeWeek && (
        <AllianceContributionModal
          players={players}
          week={activeWeek}
          existingContributions={contributions}
          lang={lang}
          onClose={() => setShowContribution(false)}
          onSaved={() => { setShowContribution(false); router.refresh() }}
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

      {showCreateUser && (
        <CreateUserModal
          players={players}
          lang={lang}
          onClose={() => setShowCreateUser(false)}
          onSaved={() => { setShowCreateUser(false); router.refresh() }}
        />
      )}
    </div>
  )
}
