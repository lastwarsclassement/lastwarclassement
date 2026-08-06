import type { EventDsEvent, Week } from '@/types'

// Unlike parseScoreInput (used for whole-number VS/contribution scores), T1 power
// keeps decimals exactly as typed when no K/M/B suffix is given (e.g. "36.32").
export function parseT1Power(input: string): number | null {
  const clean = input.trim().replace(/\s/g, '').replace(/,/g, '').toUpperCase()
  if (!clean) return null
  if (clean.endsWith('B')) {
    const val = parseFloat(clean.slice(0, -1))
    return isNaN(val) ? null : val * 1_000_000_000
  }
  if (clean.endsWith('M')) {
    const val = parseFloat(clean.slice(0, -1))
    return isNaN(val) ? null : val * 1_000_000
  }
  if (clean.endsWith('K')) {
    const val = parseFloat(clean.slice(0, -1))
    return isNaN(val) ? null : val * 1_000
  }
  const val = parseFloat(clean)
  return isNaN(val) ? null : val
}

export interface EventDsRoleDef {
  key: string
  label: string
  slots: number
}

// Rôles fixes de l'event DS Vendredi — ne pas modifier (liste métier figée).
export const EVENT_DS_ROLES: EventDsRoleDef[] = [
  { key: 'assassin_silo', label: 'Assassin puis silo après 10 min', slots: 2 },
  { key: 'hospital1_arsenal', label: 'Hospital 1 puis Arsenal', slots: 1 },
  { key: 'hospital2_mercenary', label: 'hospital 2 puis mercenary', slots: 1 },
  { key: 'science_center_1', label: 'Science center', slots: 1 },
  { key: 'science_center_2', label: 'Science center', slots: 1 },
  { key: 'hospital_3', label: 'Hospital 3', slots: 1 },
  { key: 'hospital_4', label: 'Hospital 4', slots: 1 },
  { key: 'refinery_1', label: 'Refinery 1', slots: 1 },
  { key: 'refinery_2', label: 'Refinery 2', slots: 1 },
  { key: 'info_center', label: 'info center', slots: 1 },
  { key: 'hospital_1_b', label: 'Hospital 1', slots: 1 },
  { key: 'hospital_2_b', label: 'Hospital 2', slots: 1 },
  { key: 'hospital_3_b', label: 'Hospital 3', slots: 1 },
  { key: 'hospital_4_b', label: 'Hospital 4', slots: 1 },
  { key: 'refinery_1_b', label: 'Refinery 1', slots: 1 },
  { key: 'hopital_1', label: 'Hopital 1', slots: 1 },
  { key: 'hopital_2', label: 'Hopital 2', slots: 1 },
  { key: 'hopital_3', label: 'Hopital 3', slots: 1 },
  { key: 'hopital_4', label: 'Hopital 4', slots: 1 },
]

export const EVENT_DS_EVENTS: { key: EventDsEvent; label: string }[] = [
  { key: 'B', label: 'Event B · DS 13h' },
  { key: 'A', label: 'Event A · DS 22h' },
]

// Offset (in minutes) of Europe/Paris vs UTC at the given instant, accounting for DST.
function parisOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  return Math.round((asUtc - utcMs) / 60_000)
}

// Converts a Europe/Paris wall-clock date/time into the corresponding UTC instant.
function parisWallTimeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  const offset = parisOffsetMinutes(naiveUtcMs)
  return new Date(naiveUtcMs - offset * 60_000)
}

// Event DS signups open Monday 8h and close Wednesday 22h, Europe/Paris time,
// of the week leading up to Friday's event (week.start_date is that Monday).
export function getEventDsSignupWindow(week: Pick<Week, 'start_date'>): { opensAt: Date; closesAt: Date } {
  const [year, month, day] = week.start_date.split('-').map(Number)
  return {
    opensAt: parisWallTimeToUtc(year, month, day, 8, 0),
    closesAt: parisWallTimeToUtc(year, month, day + 2, 22, 0),
  }
}

export function isEventDsSignupOpen(week: Pick<Week, 'start_date'>, now: Date = new Date()): boolean {
  const { opensAt, closesAt } = getEventDsSignupWindow(week)
  return now >= opensAt && now <= closesAt
}
