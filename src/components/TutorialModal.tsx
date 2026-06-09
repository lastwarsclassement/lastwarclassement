'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Lang = 'fr' | 'en'

interface Step {
  icon: string
  title: string
  titleEn: string
  body: string
  bodyEn: string
  pageUrl?: string
  pageFr?: string
  pageEn?: string
}

const ADMIN_STEPS: Step[] = [
  {
    icon: '⚔️',
    title: 'Bienvenue — Guide Admin',
    titleEn: 'Welcome — Admin Guide',
    body: 'Ce guide présente toutes les fonctionnalités admin dans l\'ordre logique d\'utilisation.\n\nNous allons créer les joueurs, démarrer des semaines, saisir les scores et valider les classements.',
    bodyEn: 'This guide walks you through all admin features in the order you\'ll use them.\n\nWe\'ll create players, start weeks, enter scores, and validate rankings.',
  },
  {
    icon: '➕',
    title: 'Créer des joueurs',
    titleEn: 'Create Players',
    body: 'Allez sur la page **Joueurs** (navbar) et cliquez **+ Ajouter un joueur**.\n\nRemplissez :\n• **Pseudo Last War** — identifiant de connexion\n• **Date de naissance** — pour les rôles VIP\n• **Rôle** : Lecteur (classement seul) ou Admin (accès complet)\n• **Mot de passe** — communiqué au joueur\n\nSi 100 joueurs actifs sont déjà atteints, le joueur est créé **inactif** automatiquement.',
    bodyEn: 'Go to the **Players** page (navbar) and click **+ Add player**.\n\nFill in:\n• **Last War username** — login identifier\n• **Date of birth** — for VIP roles\n• **Role**: Reader (leaderboard only) or Admin (full access)\n• **Password** — share with the player\n\nIf 100 active players are already reached, the player is created **inactive** automatically.',
    pageUrl: '/dashboard/users',
    pageFr: 'Page Joueurs',
    pageEn: 'Players Page',
  },
  {
    icon: '🔄',
    title: 'Gérer les joueurs actifs',
    titleEn: 'Manage Active Players',
    body: 'Maximum **100 joueurs actifs** dans le classement simultanément.\n\n• **Désactiver** : retire le joueur du classement (données conservées)\n• **Réactiver** : remet le joueur (bloqué si 100 actifs atteints)\n• **🗑 Supprimer** : suppression définitive du joueur et de son compte (irréversible)\n\n💡 Le bouton **Équipe démo (100)** génère de faux joueurs pour tester.',
    bodyEn: 'Maximum **100 active players** in the leaderboard at once.\n\n• **Disable**: removes player from ranking (data kept)\n• **Reactivate**: adds player back (blocked if 100 active reached)\n• **🗑 Delete**: permanently deletes player and their account (irreversible)\n\n💡 The **Demo team (100)** button generates fake players for testing.',
    pageUrl: '/dashboard/users',
    pageFr: 'Page Joueurs — onglet Joueurs',
    pageEn: 'Players Page — Players tab',
  },
  {
    icon: '🔑',
    title: 'Gérer les comptes de connexion',
    titleEn: 'Manage Login Accounts',
    body: 'L\'onglet **Comptes** liste tous les comptes Supabase créés.\n\n• **✏️ Modifier** : changer le pseudo, le mot de passe ou le rôle d\'un compte\n• **🗑 Supprimer** : supprimer un compte (les comptes admin sont protégés)\n\nChaque joueur se connecte avec son **pseudo** (pas d\'adresse email).',
    bodyEn: 'The **Accounts** tab lists all created accounts.\n\n• **✏️ Edit**: change username, password, or role\n• **🗑 Delete**: remove an account (admin accounts are protected)\n\nEach player logs in with their **username** (no email address).',
    pageUrl: '/dashboard/users',
    pageFr: 'Page Joueurs — onglet Comptes',
    pageEn: 'Players Page — Accounts tab',
  },
  {
    icon: '▶️',
    title: 'Démarrer une semaine',
    titleEn: 'Start a Week',
    body: 'Sur le **Dashboard**, si aucune semaine n\'est active, le bouton **▶ Démarrer la semaine** apparaît.\n\nCliquez dessus pour lancer une nouvelle semaine avec tous les joueurs actifs.\n\nLa semaine démarre en mode **Push** par défaut.',
    bodyEn: 'On the **Dashboard**, if no week is active, the **▶ Start week** button appears.\n\nClick it to start a new week with all active players.\n\nThe week starts in **Push** mode by default.',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard',
    pageEn: 'Dashboard',
  },
  {
    icon: '⇄',
    title: 'Choisir le type de semaine',
    titleEn: 'Choose Week Type',
    body: 'Deux types de semaines :\n\n**Push** — points selon paliers de score VS :\n→ ≥ 7.2M : +1 pt · ≥ 15M : +2 pts · ≥ 25M : +4 pts · < 7.2M : -3 pts\n\n**Éco** — rester proche de 7.2M sans dépasser 15M :\n→ Rang 1–10 : +3 pts · 11–20 : +2 pts · 21–30 : +1 pt · hors zone : -3 pts\n\nBasculez avec le bouton **⇄** à tout moment pendant la semaine.',
    bodyEn: 'Two week types:\n\n**Push** — points based on VS score thresholds:\n→ ≥ 7.2M: +1 pt · ≥ 15M: +2 pts · ≥ 25M: +4 pts · < 7.2M: -3 pts\n\n**Eco** — stay close to 7.2M without exceeding 15M:\n→ Rank 1–10: +3 pts · 11–20: +2 pts · 21–30: +1 pt · out of zone: -3 pts\n\nToggle with the **⇄** button at any time during the week.',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — bouton ⇄',
    pageEn: 'Dashboard — ⇄ button',
  },
  {
    icon: '📊',
    title: 'Saisir les scores quotidiens',
    titleEn: 'Enter Daily Scores',
    body: 'Chaque soir, cliquez **📊 Saisir les scores** :\n\n• **Lundi → Samedi** : score VS de chaque joueur\n  Format accepté : 7200000 · 7.2M · 7200K\n\n• **Dimanche** : score de **Contribution d\'Alliance** de chaque joueur\n  Points calculés automatiquement :\n  → Rang 1–10 : +10 pts · 11–20 : +6 pts · 21–30 : +3 pts\n\nLes cases ✓ indiquent les jours déjà renseignés (modifiables).',
    bodyEn: 'Each evening, click **📊 Enter scores**:\n\n• **Monday → Saturday**: each player\'s VS score\n  Accepted format: 7200000 · 7.2M · 7200K\n\n• **Sunday**: each player\'s **Alliance Contribution** score\n  Points auto-calculated:\n  → Rank 1–10: +10 pts · 11–20: +6 pts · 21–30: +3 pts\n\n✓ markers indicate already-entered days (editable).',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — 📊 Saisir les scores',
    pageEn: 'Dashboard — 📊 Enter scores',
  },
  {
    icon: '⚠️',
    title: 'Appliquer des sanctions',
    titleEn: 'Apply Sanctions',
    body: 'Cliquez **⚠️ Sanctions** pour pénaliser des joueurs.\n\n• Cochez les joueurs à sanctionner\n• Chaque sanction = **-5 pts**\n• Plusieurs sanctions cumulables sur la même semaine\n• Le compteur de sanctions existantes s\'affiche à côté de chaque joueur\n\nLes points de sanction apparaissent dans la colonne **Sanction** du classement.',
    bodyEn: 'Click **⚠️ Sanctions** to penalize players.\n\n• Check the players to sanction\n• Each sanction = **-5 pts**\n• Multiple sanctions can stack in the same week\n• Existing sanction count is shown next to each player\n\nSanction points appear in the **Sanction** column of the leaderboard.',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — ⚠️ Sanctions',
    pageEn: 'Dashboard — ⚠️ Sanctions',
  },
  {
    icon: '✅',
    title: 'Valider la semaine',
    titleEn: 'Validate the Week',
    body: 'En fin de semaine, cliquez **✅ Valider la semaine**.\n\nL\'app attribue automatiquement :\n• **Top 7 → Pilotes de Train** (-30 pts base semaine suivante)\n• **7 suivants → VIP** (-30 pts base)\n• **Anniversaires** : joueur avec anniversaire la semaine suivante = VIP forcé. S\'il est dans le top 7 : Pilote + VIP (-60 pts)\n\nVérifiez le récapitulatif puis cliquez **✅ Confirmer**.',
    bodyEn: 'At week end, click **✅ Validate week**.\n\nThe app automatically assigns:\n• **Top 7 → Train Pilots** (-30 pts next week base)\n• **Next 7 → VIP** (-30 pts base)\n• **Birthdays**: player with birthday next week = forced VIP. If in top 7: Pilot + VIP (-60 pts)\n\nVerify the summary then click **✅ Confirm**.',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — ✅ Valider',
    pageEn: 'Dashboard — ✅ Validate',
  },
  {
    icon: '🔓',
    title: 'Corriger après validation',
    titleEn: 'Correct After Validation',
    body: 'Si une erreur est détectée après validation, cliquez **🔓 Rouvrir la semaine**.\n\nLa semaine repasse en mode actif. Corrigez les scores ou sanctions, puis revalidez.\n\n⚠️ La réouverture supprime les rôles Pilote/VIP attribués — ils seront recalculés à la prochaine validation.',
    bodyEn: 'If an error is found after validation, click **🔓 Reopen week**.\n\nThe week goes back to active mode. Fix scores or sanctions, then re-validate.\n\n⚠️ Reopening clears assigned Pilot/VIP roles — they will be recalculated at next validation.',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — 🔓 Rouvrir',
    pageEn: 'Dashboard — 🔓 Reopen',
  },
  {
    icon: '📚',
    title: 'Consulter l\'historique',
    titleEn: 'View History',
    body: 'La page **Historique** (navbar) affiche tous les classements des semaines validées.\n\nSélectionnez une semaine dans le menu déroulant pour voir :\n• Le classement final\n• Les rôles attribués (Pilote / VIP)\n• Le score de base avec lequel chaque joueur a démarré la semaine suivante',
    bodyEn: 'The **History** page (navbar) shows all validated week rankings.\n\nSelect a week from the dropdown to view:\n• The final ranking\n• Assigned roles (Pilot / VIP)\n• The base score each player started the next week with',
    pageUrl: '/dashboard/history',
    pageFr: 'Page Historique',
    pageEn: 'History Page',
  },
  {
    icon: '⚙️',
    title: 'Vos paramètres personnels',
    titleEn: 'Your Personal Settings',
    body: 'Cliquez sur **⚙️** dans la navbar pour accéder à votre profil.\n\nVous pouvez :\n• Voir votre pseudo et votre rôle\n• **Changer votre mot de passe**\n\nPour modifier le pseudo ou le mot de passe d\'un autre joueur, utilisez **Page Joueurs → Onglet Comptes**.',
    bodyEn: 'Click **⚙️** in the navbar to access your profile.\n\nYou can:\n• View your username and role\n• **Change your password**\n\nTo modify another player\'s username or password, use **Players Page → Accounts tab**.',
  },
]

const READER_STEPS: Step[] = [
  {
    icon: '👁️',
    title: 'Bienvenue — Mode Lecteur',
    titleEn: 'Welcome — Reader Mode',
    body: 'En tant que **lecteur**, vous avez accès au classement en temps réel et à l\'historique des semaines passées.\n\nVous ne pouvez pas modifier de données — c\'est réservé aux admins de votre alliance.',
    bodyEn: 'As a **reader**, you have access to the live leaderboard and the history of past weeks.\n\nYou cannot modify any data — that\'s reserved for your alliance admins.',
  },
  {
    icon: '🏆',
    title: 'Le tableau de classement',
    titleEn: 'The Leaderboard',
    body: 'Le **Dashboard** affiche le classement mis à jour en temps réel après chaque saisie de scores.\n\n**Votre ligne est surlignée** en doré pour vous repérer facilement.\n\nBadges visibles à côté de votre pseudo :\n• **PILOTE** : vous étiez dans le top 7 la semaine précédente\n• **VIP** : vous étiez parmi les 7 suivants\n• **🎂** : vous avez un anniversaire la semaine prochaine',
    bodyEn: 'The **Dashboard** shows the leaderboard updated in real time after each score entry.\n\n**Your row is highlighted** in gold for easy identification.\n\nBadges visible next to your name:\n• **PILOT**: you were in the top 7 last week\n• **VIP**: you were among the next 7\n• **🎂**: you have a birthday next week',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard',
    pageEn: 'Dashboard',
  },
  {
    icon: '📊',
    title: 'Comprendre les colonnes',
    titleEn: 'Understanding the Columns',
    body: 'Le tableau contient plusieurs colonnes :\n\n• **Lun → Sam** : points gagnés ou perdus chaque jour selon votre score VS\n• **Dim.** : points de contribution d\'alliance du dimanche (classement automatique)\n• **Sanction** : malus appliqués par un admin (-5 pts par sanction)\n• **Total** : somme de tous vos points de la semaine en cours',
    bodyEn: 'The table has several columns:\n\n• **Mon → Sat**: points earned or lost each day based on your VS score\n• **Sun.**: Sunday alliance contribution points (auto-ranked)\n• **Sanction**: penalties applied by an admin (-5 pts each)\n• **Total**: sum of all your points for the current week',
    pageUrl: '/dashboard',
    pageFr: 'Dashboard — tableau',
    pageEn: 'Dashboard — table',
  },
  {
    icon: '📚',
    title: 'Historique des semaines',
    titleEn: 'Week History',
    body: 'La page **Historique** (navbar) affiche les classements de toutes les semaines passées et validées.\n\nSélectionnez une semaine dans le menu déroulant pour voir :\n• Le classement final\n• Les rôles attribués (Pilote / VIP)\n• Le score de base de la semaine suivante',
    bodyEn: 'The **History** page (navbar) shows rankings for all past validated weeks.\n\nSelect a week from the dropdown to view:\n• The final ranking\n• Assigned roles (Pilot / VIP)\n• The base score for the following week',
    pageUrl: '/dashboard/history',
    pageFr: 'Page Historique',
    pageEn: 'History Page',
  },
  {
    icon: '⚙️',
    title: 'Vos paramètres personnels',
    titleEn: 'Your Personal Settings',
    body: 'Cliquez sur **⚙️** dans la navbar pour accéder à votre profil.\n\nVous pouvez :\n• Voir votre pseudo et votre rôle\n• **Changer votre mot de passe** de connexion\n\nPour toute autre modification, contactez l\'administrateur de votre alliance.',
    bodyEn: 'Click **⚙️** in the navbar to access your profile.\n\nYou can:\n• View your username and role\n• **Change your login password**\n\nFor any other changes, contact your alliance administrator.',
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

interface Props {
  isAdmin: boolean
  lang: Lang
  onClose: () => void
}

export default function TutorialModal({ isAdmin, lang, onClose }: Props) {
  const router = useRouter()
  const steps = isAdmin ? ADMIN_STEPS : READER_STEPS
  const [current, setCurrent] = useState(0)

  const step = steps[current]
  const isFirst = current === 0
  const isLast = current === steps.length - 1

  const labelRole = isAdmin
    ? (lang === 'fr' ? 'Admin' : 'Admin')
    : (lang === 'fr' ? 'Lecteur' : 'Reader')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg fade-in" style={{ padding: '1.75rem' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span style={{
            fontFamily: 'var(--font-heading), Oswald, sans-serif',
            textTransform: 'uppercase',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: '#5B7FA8',
          }}>
            {lang === 'fr' ? 'Guide' : 'Guide'} {labelRole} — {current + 1}/{steps.length}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i <= current ? '#FFB800' : '#1E3F6F', cursor: 'pointer' }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-center mb-3">
          <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 12px rgba(255,184,0,0.3))' }}>
            {step.icon}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-heading), Oswald, sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#FFB800',
          fontSize: '1.05rem',
          textAlign: 'center',
          marginBottom: '1rem',
        }}>
          {lang === 'fr' ? step.title : step.titleEn}
        </h2>

        {/* Page indicator */}
        {step.pageUrl && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => { router.push(step.pageUrl!); onClose() }}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all hover:border-yellow-400"
              style={{
                background: 'rgba(74,126,196,0.15)',
                border: '1px solid #2A4F8A',
                color: '#A8C4E8',
                fontFamily: 'var(--font-heading), Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              📍 {lang === 'fr' ? step.pageFr : step.pageEn}
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="mb-6 text-sm leading-relaxed"
          style={{
            color: '#A8C4E8',
            fontFamily: 'var(--font-body), Nunito, sans-serif',
            minHeight: '120px',
          }}
        >
          {renderBody(lang === 'fr' ? step.body : step.bodyEn)}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrent(c => c - 1)}
            className="btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '7px 16px',
              visibility: isFirst ? 'hidden' : 'visible',
            }}
          >
            ← {lang === 'fr' ? 'Précédent' : 'Previous'}
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? '20px' : '8px',
                  height: '8px',
                  background: i === current ? '#FFB800' : '#2A4F8A',
                }}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onClose}
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '7px 18px' }}
            >
              ✓ {lang === 'fr' ? 'Terminer' : 'Finish'}
            </button>
          ) : (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '7px 18px' }}
            >
              {lang === 'fr' ? 'Suivant' : 'Next'} →
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
