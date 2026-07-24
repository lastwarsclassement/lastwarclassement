import type { EventDsEvent } from '@/types'

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
