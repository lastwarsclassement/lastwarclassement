'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Lang } from '@/lib/utils'
type Role = 'admin' | 'reader'

interface TutorialState { active: boolean; role: Role; step: number }

const KEY = 'lw_tutorial'
function loadState(): TutorialState | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
function saveState(s: TutorialState) { localStorage.setItem(KEY, JSON.stringify(s)) }
function clearState() { localStorage.removeItem(KEY) }

export function startTutorial(role: Role) {
  saveState({ active: true, role, step: 0 })
  window.dispatchEvent(new CustomEvent('lw:tutorial'))
}

interface Step {
  icon: string
  title: string; titleEn: string
  body: string; bodyEn: string
  page: string | null   // null = stay on current page
  target?: string       // data-tutorial attribute value
}

const ADMIN_STEPS: Step[] = [
  {
    icon: '⚔️', page: '/dashboard',
    title: 'Bienvenue — Guide Admin', titleEn: 'Welcome — Admin Guide',
    body: 'Ce guide interactif vous présente toutes les fonctionnalités dans l\'ordre d\'utilisation.\n\nCliquez **Suivant** pour commencer.',
    bodyEn: 'This interactive guide walks you through all features in usage order.\n\nClick **Next** to begin.',
  },
  {
    icon: '➕', page: '/dashboard/users', target: 'add-player-btn',
    title: 'Créer des joueurs', titleEn: 'Create Players',
    body: 'Ce bouton ouvre le formulaire de création d\'un joueur.\n\nRemplissez :\n• **Pseudo Last War** — identifiant de connexion\n• **Date de naissance** — pour les rôles VIP\n• **Rôle** : Lecteur ou Admin\n• **Mot de passe** — à communiquer au joueur\n\nSi 100 joueurs actifs sont déjà présents, le joueur est créé **inactif** automatiquement.',
    bodyEn: 'This button opens the player creation form.\n\nFill in:\n• **Last War username** — login identifier\n• **Date of birth** — for VIP roles\n• **Role**: Reader or Admin\n• **Password** — share with the player\n\nIf 100 active players already exist, the player is created **inactive** automatically.',
  },
  {
    icon: '🔄', page: '/dashboard/users', target: 'players-table',
    title: 'Gérer les joueurs actifs', titleEn: 'Manage Active Players',
    body: 'Ce tableau liste tous les joueurs (**actifs + inactifs**).\n\nMaximum **100 joueurs actifs** simultanément.\n\n• **Désactiver** : retire du classement (données conservées)\n• **Réactiver** : remet dans le classement\n• **🗑** : suppression définitive avec confirmation',
    bodyEn: 'This table lists all players (**active + inactive**).\n\nMaximum **100 active players** at once.\n\n• **Disable**: removes from leaderboard (data kept)\n• **Reactivate**: adds back to leaderboard\n• **🗑**: permanent deletion with confirmation',
  },
  {
    icon: '🔑', page: '/dashboard/users', target: 'accounts-tab',
    title: 'Gérer les comptes', titleEn: 'Manage Accounts',
    body: 'Cet onglet liste tous les comptes de connexion.\n\n• **✏️ Modifier** : changer le pseudo, mot de passe ou rôle\n• **🗑 Supprimer** : supprimer un compte (admins protégés)\n\nChaque joueur se connecte avec son **pseudo** (pas d\'email).',
    bodyEn: 'This tab lists all login accounts.\n\n• **✏️ Edit**: change username, password, or role\n• **🗑 Delete**: delete an account (admins protected)\n\nEach player logs in with their **username** (no email).',
  },
  {
    icon: '▶️', page: '/dashboard', target: 'start-week-btn',
    title: 'Démarrer une semaine', titleEn: 'Start a Week',
    body: 'Ce bouton lance une nouvelle semaine avec tous les joueurs actifs.\n\nIl est visible uniquement **quand aucune semaine n\'est en cours**.\n\nLa semaine démarre en mode **Push** par défaut.',
    bodyEn: 'This button starts a new week with all active players.\n\nIt is visible only **when no week is currently active**.\n\nThe week starts in **Push** mode by default.',
  },
  {
    icon: '⇄', page: '/dashboard', target: 'toggle-week-type',
    title: 'Type de semaine Push / Éco', titleEn: 'Push / Eco Week Type',
    body: 'Ce bouton bascule le mode de la semaine.\n\n**Push** — points selon paliers de score VS :\n→ ≥ 7.2M : +1 · ≥ 15M : +2 · ≥ 25M : +4 · < 7.2M : -3\n\n**Éco** — rester proche de 7.2M sans dépasser 15M :\n→ Rang 1–10 : +3 · 11–20 : +2 · 21–30 : +1 · hors zone : -3',
    bodyEn: 'This button toggles the week mode.\n\n**Push** — points based on VS score thresholds:\n→ ≥ 7.2M: +1 · ≥ 15M: +2 · ≥ 25M: +4 · < 7.2M: -3\n\n**Eco** — stay close to 7.2M without exceeding 15M:\n→ Rank 1–10: +3 · 11–20: +2 · 21–30: +1 · out of zone: -3',
  },
  {
    icon: '📊', page: '/dashboard', target: 'enter-scores-btn',
    title: 'Saisir les scores', titleEn: 'Enter Scores',
    body: 'Ce bouton ouvre la saisie des scores journaliers.\n\n• **Lun → Sam** : score VS (ex : 7.2M, 15000K, 25000000)\n• **Dimanche** : score de Contribution d\'Alliance\n  → Rang 1–10 : **+10 pts** · 11–20 : **+6 pts** · 21–30 : **+3 pts**\n\nLes cases ✓ indiquent les jours déjà renseignés (modifiables).',
    bodyEn: 'This button opens the daily score entry modal.\n\n• **Mon → Sat**: VS score (e.g. 7.2M, 15000K, 25000000)\n• **Sunday**: Alliance Contribution score\n  → Rank 1–10: **+10 pts** · 11–20: **+6 pts** · 21–30: **+3 pts**\n\n✓ markers show already-entered days (editable).',
  },
  {
    icon: '⚠️', page: '/dashboard', target: 'sanctions-btn',
    title: 'Appliquer des sanctions', titleEn: 'Apply Sanctions',
    body: 'Ce bouton ouvre le panneau de sanctions.\n\nCochez les joueurs à pénaliser : chaque sanction = **-5 pts**.\n\nPlusieurs sanctions sont cumulables sur la même semaine. Le compteur existant s\'affiche à côté de chaque joueur.',
    bodyEn: 'This button opens the sanctions panel.\n\nCheck the players to penalize: each sanction = **-5 pts**.\n\nMultiple sanctions stack in the same week. The existing count is shown next to each player.',
  },
  {
    icon: '✅', page: '/dashboard', target: 'validate-btn',
    title: 'Valider la semaine', titleEn: 'Validate the Week',
    body: 'Ce bouton clôture la semaine et fige le classement.\n\nL\'app attribue automatiquement :\n• **Top 7 → Pilotes** : base semaine suivante = **0**\n• **7 suivants → VIP** : base semaine suivante = **0**\n• **Anniversaires** → VIP forcé (base = **0**)\n• **Autres joueurs** → conservent leurs points comme base\n\nVérifiez le récapitulatif puis confirmez.',
    bodyEn: 'This button closes the week and locks the ranking.\n\nThe app automatically assigns:\n• **Top 7 → Pilots**: next week base = **0**\n• **Next 7 → VIP**: next week base = **0**\n• **Birthdays** → forced VIP (base = **0**)\n• **Other players** → keep their points as base\n\nVerify the summary then confirm.',
  },
  {
    icon: '🔓', page: '/dashboard', target: 'reopen-btn',
    title: 'Rouvrir après validation', titleEn: 'Reopen After Validation',
    body: 'Ce bouton apparaît **après validation** si une correction est nécessaire.\n\nLa semaine repasse en mode actif. Corrigez scores ou sanctions, puis revalidez.\n\n⚠️ Les rôles Pilote/VIP sont effacés et recalculés à la prochaine validation.',
    bodyEn: 'This button appears **after validation** if a correction is needed.\n\nThe week goes back to active. Fix scores or sanctions, then re-validate.\n\n⚠️ Pilot/VIP roles are cleared and recalculated at next validation.',
  },
  {
    icon: '📚', page: '/dashboard/history', target: 'history-dropdown',
    title: 'Consulter l\'historique', titleEn: 'View History',
    body: 'Ce menu déroulant liste toutes les semaines validées.\n\nSélectionnez-en une pour voir :\n• Le classement final\n• Les rôles attribués (Pilote / VIP)\n• Le score de base de la semaine suivante',
    bodyEn: 'This dropdown lists all validated weeks.\n\nSelect one to view:\n• The final ranking\n• Assigned roles (Pilot / VIP)\n• The base score for the following week',
  },
  {
    icon: '⚙️', page: null, target: 'profile-btn',
    title: 'Vos paramètres personnels', titleEn: 'Your Personal Settings',
    body: 'Ce bouton ouvre votre profil personnel.\n\nVous pouvez **changer votre mot de passe** à tout moment.\n\nPour modifier le pseudo ou le mot de passe d\'un autre joueur : **Page Joueurs → Onglet Comptes**.',
    bodyEn: 'This button opens your personal profile.\n\nYou can **change your password** at any time.\n\nTo modify another player\'s username or password: **Players Page → Accounts tab**.',
  },
]

const READER_STEPS: Step[] = [
  {
    icon: '👁️', page: '/dashboard',
    title: 'Bienvenue — Mode Lecteur', titleEn: 'Welcome — Reader Mode',
    body: 'En tant que **lecteur**, vous accédez au classement en temps réel et à l\'historique des semaines passées.\n\nCliquez **Suivant** pour découvrir l\'interface.',
    bodyEn: 'As a **reader**, you have access to the live leaderboard and history.\n\nClick **Next** to explore the interface.',
  },
  {
    icon: '🏆', page: '/dashboard', target: 'leaderboard-table',
    title: 'Le tableau de classement', titleEn: 'The Leaderboard',
    body: 'Ce tableau affiche le classement mis à jour après chaque saisie de scores.\n\n**Votre ligne est surlignée** en doré.\n\nBadges affichés à côté de votre pseudo :\n• **PILOTE** : top 7 de la semaine précédente\n• **VIP** : 7 suivants\n• **🎂** : anniversaire la semaine prochaine',
    bodyEn: 'This table shows the ranking updated after each score entry.\n\n**Your row is highlighted** in gold.\n\nBadges next to your name:\n• **PILOT**: top 7 from previous week\n• **VIP**: next 7\n• **🎂**: birthday next week',
  },
  {
    icon: '📊', page: '/dashboard', target: 'leaderboard-table',
    title: 'Comprendre les colonnes', titleEn: 'Understanding the Columns',
    body: 'Chaque colonne représente :\n\n• **Lun → Sam** : points gagnés ou perdus selon votre score VS du jour\n• **Dim.** : points de contribution d\'alliance du dimanche (classement automatique)\n• **Sanction** : malus appliqués par un admin (-5 pts chacun)\n• **Total** : cumul de tous vos points de la semaine en cours',
    bodyEn: 'Each column represents:\n\n• **Mon → Sat**: points won or lost based on your VS score\n• **Sun.**: Sunday alliance contribution points (auto-ranked)\n• **Sanction**: penalties applied by an admin (-5 pts each)\n• **Total**: all your points accumulated for the current week',
  },
  {
    icon: '📚', page: '/dashboard/history', target: 'history-dropdown',
    title: 'Historique des semaines', titleEn: 'Week History',
    body: 'Ce menu déroulant liste toutes les semaines passées et validées.\n\nSélectionnez-en une pour consulter :\n• Le classement final\n• Les rôles attribués (Pilote / VIP)\n• Le score de base de la semaine suivante',
    bodyEn: 'This dropdown lists all past validated weeks.\n\nSelect one to view:\n• The final ranking\n• Assigned roles (Pilot / VIP)\n• The base score for the following week',
  },
  {
    icon: '⚙️', page: null, target: 'profile-btn',
    title: 'Vos paramètres', titleEn: 'Your Settings',
    body: 'Ce bouton ouvre votre profil.\n\nVous pouvez **changer votre mot de passe** de connexion.\n\nPour toute autre modification, contactez l\'administrateur de votre alliance.',
    bodyEn: 'This button opens your profile.\n\nYou can **change your login password**.\n\nFor any other changes, contact your alliance administrator.',
  },
]

function renderBody(text: string) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <span key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} style={{ color: '#FFFFFF', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < arr.length - 1 && <br />}
      </span>
    )
  })
}

interface Props { isAdmin: boolean; lang: Lang }

const PAD = 10

export default function TutorialSpotlight({ isAdmin, lang }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [tut, setTut] = useState<TutorialState | null>(null)
  const [rect, setRect] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null)
  const [ready, setReady] = useState(false)

  const steps = isAdmin ? ADMIN_STEPS : READER_STEPS

  // Load on mount + listen for start event
  useEffect(() => {
    const load = () => {
      const s = loadState()
      setTut(s?.active ? s : null)
    }
    load()
    window.addEventListener('lw:tutorial', load)
    return () => window.removeEventListener('lw:tutorial', load)
  }, [])

  // Navigate + find target when step changes
  useEffect(() => {
    if (!tut?.active) return
    const step = steps[tut.step]
    if (!step) return

    setReady(false)
    setRect(null)

    // Navigate if needed
    if (step.page && step.page !== pathname) {
      router.push(step.page)
      return
    }

    // No target — centered modal, show immediately
    if (!step.target) {
      setReady(true)
      return
    }

    const NAVBAR_H = 72 // navbar height + small buffer

    const find = () => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`) as HTMLElement | null
      if (!el) {
        setReady(true)
        return
      }
      const r = el.getBoundingClientRect()
      const inView = r.top >= NAVBAR_H && r.bottom <= window.innerHeight - 20

      const getAndSet = () => {
        const r2 = el.getBoundingClientRect()
        setRect({ top: r2.top, left: r2.left, right: r2.right, bottom: r2.bottom, width: r2.width, height: r2.height })
        setReady(true)
      }

      if (inView) {
        getAndSet()
      } else {
        // Scroll element just below navbar — window.scrollTo(x,y) is always synchronous
        const target = window.scrollY + r.top - NAVBAR_H - PAD
        window.scrollTo(0, Math.max(0, target))
        // One rAF so the browser commits the scroll before we measure
        requestAnimationFrame(getAndSet)
      }
    }

    const t = setTimeout(find, 60)
    return () => clearTimeout(t)
  }, [tut?.step, pathname])

  // Update rect on scroll / resize
  useEffect(() => {
    if (!tut?.active) return
    const step = steps[tut.step]
    if (!step?.target) return
    const update = () => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height })
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [tut?.active, tut?.step])

  if (!tut?.active || !ready) return null
  const step = steps[tut.step]
  if (!step) return null

  const isFirst = tut.step === 0
  const isLast = tut.step === steps.length - 1
  const W = typeof window !== 'undefined' ? window.innerWidth : 1440
  const H = typeof window !== 'undefined' ? window.innerHeight : 900
  const isMobile = W < 520
  const TW = isMobile ? W - 0 : 340  // full-width on mobile

  function goTo(n: number) {
    const ns: TutorialState = { active: true, role: isAdmin ? 'admin' : 'reader', step: n }
    saveState(ns)
    setReady(false)
    setRect(null)
    setTut(ns)
  }
  function close() { clearState(); setTut(null); setRect(null); setReady(false) }

  // Tooltip position — bottom sheet on mobile, adjacent to target on desktop
  let tipStyle: React.CSSProperties
  if (isMobile) {
    tipStyle = {
      position: 'fixed', bottom: 0, left: 0, right: 0,
      borderRadius: '16px 16px 0 0',
      maxHeight: '55vh', overflowY: 'auto',
      zIndex: 9002,
    }
  } else if (rect) {
    const spaceBelow = H - rect.bottom - PAD
    const spaceAbove = rect.top - PAD
    const idealLeft = Math.max(12, Math.min(rect.left + rect.width / 2 - TW / 2, W - TW - 12))
    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      tipStyle = { position: 'fixed', top: rect.bottom + PAD + 8, left: idealLeft, width: TW, zIndex: 9002 }
    } else {
      tipStyle = { position: 'fixed', bottom: H - rect.top + PAD + 8, left: idealLeft, width: TW, zIndex: 9002 }
    }
  } else {
    tipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TW, zIndex: 9002 }
  }

  // On mobile, the backdrop only covers above the bottom sheet (not the full screen split)
  const SHEET_H = isMobile ? Math.round(H * 0.55) : 0

  return (
    <>
      {/* Backdrop */}
      {rect && !isMobile ? (
        <>
          <div onClick={close} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD), background: 'rgba(5,12,28,0.88)', zIndex: 9000 }} />
          <div onClick={close} style={{ position: 'fixed', top: rect.bottom + PAD, left: 0, right: 0, bottom: 0, background: 'rgba(5,12,28,0.88)', zIndex: 9000 }} />
          <div onClick={close} style={{ position: 'fixed', top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2, background: 'rgba(5,12,28,0.88)', zIndex: 9000 }} />
          <div onClick={close} style={{ position: 'fixed', top: rect.top - PAD, left: rect.right + PAD, right: 0, height: rect.height + PAD * 2, background: 'rgba(5,12,28,0.88)', zIndex: 9000 }} />
          {/* Golden border */}
          <div style={{ position: 'fixed', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, border: '2px solid #FFB800', borderRadius: '10px', boxShadow: '0 0 0 2px rgba(255,184,0,0.2), 0 0 28px rgba(255,184,0,0.25)', zIndex: 9001, pointerEvents: 'none' }} />
        </>
      ) : rect && isMobile ? (
        <>
          {/* Mobile: dark overlay above sheet, spotlight around target */}
          <div onClick={close} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: SHEET_H, background: 'rgba(5,12,28,0.82)', zIndex: 9000 }} />
          {/* Golden border */}
          <div style={{ position: 'fixed', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, border: '2px solid #FFB800', borderRadius: '10px', boxShadow: '0 0 28px rgba(255,184,0,0.25)', zIndex: 9001, pointerEvents: 'none' }} />
        </>
      ) : (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(5,12,28,0.88)', zIndex: 9000 }} />
      )}

      {/* Tooltip */}
      <div key={tut.step} style={tipStyle} className="card fade-in" onClick={e => e.stopPropagation()}>

        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ width: '36px', height: '4px', background: '#2A4F8A', borderRadius: '2px', margin: '0 auto 14px' }} />
        )}

        {/* Progress bar */}
        <div className="flex gap-0.5 mb-3">
          {steps.map((_, i) => (
            <div key={i} onClick={() => goTo(i)}
              className="flex-1 rounded-full cursor-pointer transition-all"
              style={{ height: '3px', background: i <= tut.step ? '#FFB800' : '#1E3F6F' }} />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: isMobile ? '1.3rem' : '1.1rem' }}>{step.icon}</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#5B7FA8' }}>
            {tut.step + 1} / {steps.length}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontFamily: 'var(--font-heading), Oswald, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFB800', fontSize: isMobile ? '0.95rem' : '0.88rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
          {lang === 'fr' ? step.title : step.titleEn}
        </h3>

        {/* Body */}
        <div style={{ color: '#A8C4E8', fontFamily: 'var(--font-body), Nunito, sans-serif', fontSize: isMobile ? '0.875rem' : '0.8rem', lineHeight: 1.65, marginBottom: '0.875rem' }}>
          {renderBody(lang === 'fr' ? step.body : step.bodyEn)}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={close} style={{ fontSize: '0.7rem', color: '#5B7FA8', background: 'none', border: 'none', cursor: 'pointer', padding: isMobile ? '8px 0' : '2px 0', fontFamily: 'var(--font-body)' }}>
            {lang === 'fr' ? 'Quitter' : 'Exit'}
          </button>
          <div className="flex gap-1.5">
            {!isFirst && (
              <button onClick={() => goTo(tut.step - 1)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: isMobile ? '8px 16px' : '5px 12px' }}>←</button>
            )}
            {isLast
              ? <button onClick={close} className="btn-primary" style={{ fontSize: '0.75rem', padding: isMobile ? '8px 20px' : '5px 14px' }}>✓ {lang === 'fr' ? 'Terminer' : 'Finish'}</button>
              : <button onClick={() => goTo(tut.step + 1)} className="btn-primary" style={{ fontSize: '0.75rem', padding: isMobile ? '8px 20px' : '5px 14px' }}>{lang === 'fr' ? 'Suivant' : 'Next'} →</button>
            }
          </div>
        </div>
      </div>
    </>
  )
}
