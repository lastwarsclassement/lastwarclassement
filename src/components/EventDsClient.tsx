'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSLATIONS, Lang, formatScore } from '@/lib/utils'
import { EVENT_DS_ROLES, parseT1Power, isEventDsSignupOpen } from '@/lib/eventDs'
import type { Profile, Player, Week, EventDsSignup, EventDsAssignment, EventDsStatus, EventDsEvent } from '@/types'
import Navbar from './Navbar'
import ProfileModal from './ProfileModal'

interface Props {
  profile: Profile | null
  players: Player[]
  activeWeek: Week | null
  signups: EventDsSignup[]
  assignments: EventDsAssignment[]
}

function fridayDate(week: Week): string {
  const start = new Date(week.start_date + 'T00:00:00Z')
  const friday = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 4))
  return friday.toISOString().split('T')[0]
}

function assignmentKey(roleKey: string, slotIndex: number, event: EventDsEvent) {
  return `${roleKey}_${slotIndex}_${event}`
}

export default function EventDsClient({ profile, players, activeWeek, signups, assignments }: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const [showProfile, setShowProfile] = useState(false)
  const t = TRANSLATIONS[lang]

  const isAdmin = profile?.role === 'admin'
  const currentPlayer = players.find(p => p.id === profile?.player_id) ?? null
  const mySignup = signups.find(s => s.player_id === currentPlayer?.id) ?? null
  const signupOpen = activeWeek ? isEventDsSignupOpen(activeWeek) : false

  const [t1PowerInput, setT1PowerInput] = useState(mySignup?.t1_power ? formatScore(mySignup.t1_power) : '')
  const [eventAStatus, setEventAStatus] = useState<EventDsStatus>(mySignup?.event_a_status ?? 'absent')
  const [eventBStatus, setEventBStatus] = useState<EventDsStatus>(mySignup?.event_b_status ?? 'absent')
  const [vocal, setVocal] = useState(mySignup?.vocal ?? false)
  const [editing, setEditing] = useState(signupOpen && !mySignup?.validated)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasInvalidCombo =
    (eventAStatus === 'present' && eventBStatus !== 'absent') ||
    (eventBStatus === 'present' && eventAStatus !== 'absent')

  const [assignmentMap, setAssignmentMap] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    assignments.forEach(a => { map[assignmentKey(a.role_key, a.slot_index, a.event)] = a.player_id })
    return map
  })

  function setStatus(event: EventDsEvent, status: EventDsStatus) {
    if (event === 'A') {
      setEventAStatus(status)
      if (status === 'present') setEventBStatus('absent')
    } else {
      setEventBStatus(status)
      if (status === 'present') setEventAStatus('absent')
    }
  }

  async function handleSubmit(validated: boolean) {
    if (!activeWeek) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/event-ds/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: activeWeek.id,
        t1Power: parseT1Power(t1PowerInput),
        eventAStatus,
        eventBStatus,
        vocal,
        validated,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      setSaving(false)
      return
    }

    setEditing(!validated)
    setSaving(false)
    router.refresh()
  }

  function statusLabel(status: EventDsStatus) {
    return status === 'present' ? t.statusPresent : status === 'remplacant' ? t.statusRemplacant : t.statusAbsent
  }

  function statusPicker(event: EventDsEvent, current: EventDsStatus, label: string) {
    return (
      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        <div className="flex gap-1">
          {(['present', 'remplacant', 'absent'] as EventDsStatus[]).map(s => (
            <button
              key={s}
              type="button"
              disabled={!editing}
              onClick={() => setStatus(event, s)}
              className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                current === s
                  ? 'bg-amber-400 text-black border-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-400/50'
              } ${!editing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // --- Admin: role assignment table ---
  function presentPlayers(event: EventDsEvent) {
    return players.filter(p => {
      const su = signups.find(s => s.player_id === p.id)
      if (!su) return false
      return (event === 'A' ? su.event_a_status : su.event_b_status) === 'present'
    })
  }

  function substitutePlayers(event: EventDsEvent) {
    return players.filter(p => {
      const su = signups.find(s => s.player_id === p.id)
      if (!su) return false
      return (event === 'A' ? su.event_a_status : su.event_b_status) === 'remplacant'
    })
  }

  function usedPlayerIds(event: EventDsEvent) {
    const used = new Set<string>()
    Object.entries(assignmentMap).forEach(([key, playerId]) => {
      if (playerId && key.endsWith(`_${event}`)) used.add(playerId)
    })
    return used
  }

  function vocalIcon(playerId: string) {
    return signups.find(s => s.player_id === playerId)?.vocal ? ' 🎤' : ''
  }

  function t1PowerLabel(playerId: string) {
    const power = signups.find(s => s.player_id === playerId)?.t1_power
    return power ? ` (${formatScore(power)})` : ''
  }

  async function handleAssign(roleKey: string, slotIndex: number, event: EventDsEvent, playerId: string | null) {
    const key = assignmentKey(roleKey, slotIndex, event)
    setAssignmentMap(prev => ({ ...prev, [key]: playerId }))
    await fetch('/api/admin/event-ds/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: activeWeek!.id, roleKey, slotIndex, event, playerId }),
    })
  }

  function renderAssignCell(role: typeof EVENT_DS_ROLES[number], event: EventDsEvent, editable: boolean) {
    const used = usedPlayerIds(event)
    const presentCandidates = presentPlayers(event)
    const substituteCandidates = substitutePlayers(event)
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: role.slots }, (_, slotIndex) => {
          const key = assignmentKey(role.key, slotIndex, event)
          const assignedId = assignmentMap[key] ?? ''

          if (!editable) {
            const assignedPlayer = assignedId ? players.find(p => p.id === assignedId) : null
            return (
              <div key={key} className="text-xs text-slate-200 px-1 py-1">
                {assignedPlayer ? `${assignedPlayer.display_name}${t1PowerLabel(assignedPlayer.id)}${vocalIcon(assignedPlayer.id)}` : '—'}
              </div>
            )
          }

          const presentOptions = presentCandidates.filter(p => p.id === assignedId || !used.has(p.id))
          const substituteOptions = substituteCandidates.filter(p => p.id === assignedId || !used.has(p.id))
          return (
            <select
              key={key}
              className="input-field text-xs py-1"
              value={assignedId}
              onChange={e => handleAssign(role.key, slotIndex, event, e.target.value || null)}
            >
              <option value="">—</option>
              {presentOptions.length > 0 && (
                <optgroup label={t.statusPresent}>
                  {presentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name}{t1PowerLabel(p.id)}{vocalIcon(p.id)}</option>
                  ))}
                </optgroup>
              )}
              {substituteOptions.length > 0 && (
                <optgroup label={t.statusRemplacant}>
                  {substituteOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name}{t1PowerLabel(p.id)}{vocalIcon(p.id)}</option>
                  ))}
                </optgroup>
              )}
            </select>
          )
        })}
      </div>
    )
  }

  function renderRecapTable() {
    return (
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold">{t.eventDsRecap}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">{t.player}</th>
                <th className="table-th-center">{t.eventDsT1Power}</th>
                <th className="table-th-center">Event A · DS 22h</th>
                <th className="table-th-center">Event B · DS 13h</th>
                <th className="table-th-center">{t.eventDsVocal}</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                const su = signups.find(s => s.player_id === p.id)
                return (
                  <tr key={p.id} className="border-b border-slate-700/50 table-row-hover">
                    <td className="px-4 py-2 text-white">{p.display_name}</td>
                    <td className="px-4 py-2 text-center text-slate-300">
                      {su?.t1_power ? formatScore(su.t1_power) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-300">
                      {su ? statusLabel(su.event_a_status) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-300">
                      {su ? statusLabel(su.event_b_status) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center">{su?.vocal ? '🎤' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderRoleTable(editable: boolean) {
    return (
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold">{t.eventDsAssignments}</h2>
          {!editable && (
            <span className="text-xs text-slate-500">{lang === 'fr' ? 'Lecture seule' : 'Read-only'}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-th">{t.role}</th>
                <th className="table-th">Event A · DS 22h</th>
                <th className="table-th">Event B · DS 13h</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_DS_ROLES.map(role => (
                <tr key={role.key} className="border-b border-slate-700/50 table-row-hover">
                  <td className="px-4 py-2 text-white truncate" title={role.label}>{role.label}</td>
                  <td className="px-4 py-2">{renderAssignCell(role, 'A', editable)}</td>
                  <td className="px-4 py-2">{renderAssignCell(role, 'B', editable)}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-2 text-white font-semibold">{t.eventDsSubstitutes}</td>
                <td className="px-4 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    {substitutePlayers('A').map(p => (
                      <div key={p.id} className="input-field text-xs py-1 bg-slate-800/50">
                        {p.display_name}{t1PowerLabel(p.id)}{vocalIcon(p.id)}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    {substitutePlayers('B').map(p => (
                      <div key={p.id} className="input-field text-xs py-1 bg-slate-800/50">
                        {p.display_name}{t1PowerLabel(p.id)}{vocalIcon(p.id)}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
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
        <h1 className="lw-title text-2xl mb-6">🗓️ {t.eventDs}</h1>

        {!activeWeek && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-400">{t.noActiveWeek}</p>
          </div>
        )}

        {activeWeek && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              {lang === 'fr' ? 'Vendredi' : 'Friday'} {fridayDate(activeWeek)}
            </p>

            {!signupOpen && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-3 text-amber-400 text-sm">
                {t.eventDsSignupClosed}
              </div>
            )}

            {/* Personal form */}
            {currentPlayer ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">{t.eventDsMyResponse}</h2>
                  {!editing && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-400/10 border-emerald-400/30 text-emerald-400">
                      ✓ {t.eventDsValidated}
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="text-xs text-slate-400 mb-1 block">{t.eventDsT1Power}</label>
                  <input
                    type="text"
                    className="input-field max-w-xs"
                    placeholder="1.5B · 150M"
                    disabled={!editing}
                    value={t1PowerInput}
                    onChange={e => setT1PowerInput(e.target.value)}
                  />
                </div>

                {statusPicker('B', eventBStatus, 'Event B · DS 13h')}
                {statusPicker('A', eventAStatus, 'Event A · DS 22h')}

                {hasInvalidCombo && (
                  <div className="mb-3 text-xs text-red-400">{t.eventDsBothPresent}</div>
                )}

                <label className="flex items-center gap-2 mb-4 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    disabled={!editing}
                    checked={vocal}
                    onChange={e => setVocal(e.target.checked)}
                  />
                  {t.eventDsVocal}
                </label>

                {error && (
                  <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {editing ? (
                    <button
                      onClick={() => handleSubmit(true)}
                      disabled={saving || hasInvalidCombo}
                      className="btn-primary"
                    >
                      {saving ? t.loading : t.validate}
                    </button>
                  ) : signupOpen ? (
                    <button onClick={() => handleSubmit(false)} disabled={saving} className="btn-secondary">
                      {saving ? t.loading : t.edit}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : !isAdmin && (
              <div className="card p-6 text-center text-slate-400">{t.eventDsNoPlayer}</div>
            )}

            {/* Role assignment table: editable for admins, read-only for players */}
            {isAdmin && renderRoleTable(true)}
            {!isAdmin && currentPlayer && renderRoleTable(false)}

            {/* Recap table: T1 power, statuses, vocal for every player — always read-only */}
            {(isAdmin || currentPlayer) && renderRecapTable()}
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
