export function formatScore(score: number): string {
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(2) + 'M'
  if (score >= 1_000) return (score / 1_000).toFixed(0) + 'K'
  return score.toString()
}

export function parseScoreInput(input: string): number {
  const clean = input.replace(/\s/g, '').replace(',', '.')
  if (clean.toLowerCase().endsWith('m')) {
    return Math.round(parseFloat(clean) * 1_000_000)
  }
  if (clean.toLowerCase().endsWith('k')) {
    return Math.round(parseFloat(clean) * 1_000)
  }
  return parseInt(clean, 10) || 0
}

export function formatDate(dateStr: string, locale: 'fr' | 'en' = 'fr'): string {
  return new Date(dateStr).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getDayName(dateStr: string, locale: 'fr' | 'en' = 'fr'): string {
  return new Date(dateStr).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
  })
}

export function toEmailFormat(username: string): string {
  return `${username.toLowerCase().replace(/\s+/g, '_')}@lastwar.internal`
}

export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-slate-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-slate-400'
}

export function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-yellow-400/10 border-yellow-400/30'
  if (rank === 2) return 'bg-slate-300/10 border-slate-300/30'
  if (rank === 3) return 'bg-amber-600/10 border-amber-600/30'
  return ''
}

export const TRANSLATIONS = {
  fr: {
    title: 'Classement Last War',
    login: 'Connexion',
    logout: 'Déconnexion',
    username: 'Pseudo',
    password: 'Mot de passe',
    birthdate: 'Date de naissance',
    showPassword: 'Afficher',
    hidePassword: 'Masquer',
    rank: 'Rang',
    player: 'Joueur',
    baseScore: 'Base',
    dailyPts: 'Points / Jour',
    contribPts: 'Contrib.',
    sanctionPts: 'Sanctions',
    total: 'Total',
    role: 'Rôle',
    pilot: 'Pilote de Train',
    vip: 'VIP',
    weekType: 'Type de semaine',
    pushWeek: 'Semaine Push',
    ecoWeek: 'Semaine Éco',
    enterScores: 'Saisir les scores',
    contribution: 'Contribution d\'Alliance',
    sanctions: 'Sanctions',
    validateWeek: 'Valider la semaine',
    createUser: 'Créer un compte',
    history: 'Historique',
    dashboard: 'Classement',
    admin: 'Admin',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    selectDate: 'Choisir une date',
    vsScore: 'Score VS',
    contribScore: 'Score Contribution',
    sunday: 'Dimanche',
    step: 'Étape',
    top10: 'Top 10 (+10 pts)',
    next10: 'Suivants 10 (+6 pts)',
    last10: 'Derniers 10 (+3 pts)',
    sanctionMinus5: 'Sanction (-5 pts)',
    weekNumber: 'Semaine',
    activeWeek: 'Semaine active',
    noActiveWeek: 'Aucune semaine active',
    startWeek: 'Démarrer la semaine',
    birthday: 'Anniversaire',
    birthdayNote: 'anniversaire(s) cette semaine → places VIP réservées',
    pilotNote: '7 premiers → Pilotes de Train',
    vipNote: 'Suivants → VIP',
    weekValidated: 'Semaine validée',
    reopenWeek: 'Rouvrir la semaine',
    selectAll: 'Tout sélectionner',
    deselect: 'Désélectionner',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    weekHistory: 'Historique des semaines',
    noHistory: 'Aucun historique disponible',
    displayName: 'Nom affiché',
    role_admin: 'Administrateur',
    role_reader: 'Lecteur',
    accountType: 'Type de compte',
  },
  en: {
    title: 'Last War Leaderboard',
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    birthdate: 'Birthday',
    showPassword: 'Show',
    hidePassword: 'Hide',
    rank: 'Rank',
    player: 'Player',
    baseScore: 'Base',
    dailyPts: 'Daily Pts',
    contribPts: 'Contrib.',
    sanctionPts: 'Sanctions',
    total: 'Total',
    role: 'Role',
    pilot: 'Train Pilot',
    vip: 'VIP',
    weekType: 'Week type',
    pushWeek: 'Push Week',
    ecoWeek: 'Eco Week',
    enterScores: 'Enter Scores',
    contribution: 'Alliance Contribution',
    sanctions: 'Sanctions',
    validateWeek: 'Validate Week',
    createUser: 'Create Account',
    history: 'History',
    dashboard: 'Leaderboard',
    admin: 'Admin',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    selectDate: 'Select date',
    vsScore: 'VS Score',
    contribScore: 'Contribution Score',
    sunday: 'Sunday',
    step: 'Step',
    top10: 'Top 10 (+10 pts)',
    next10: 'Next 10 (+6 pts)',
    last10: 'Last 10 (+3 pts)',
    sanctionMinus5: 'Sanction (-5 pts)',
    weekNumber: 'Week',
    activeWeek: 'Active week',
    noActiveWeek: 'No active week',
    startWeek: 'Start week',
    birthday: 'Birthday',
    birthdayNote: 'birthday(s) this week → reserved VIP spots',
    pilotNote: 'Top 7 → Train Pilots',
    vipNote: 'Next → VIP',
    weekValidated: 'Week validated',
    reopenWeek: 'Reopen week',
    selectAll: 'Select all',
    deselect: 'Deselect',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    weekHistory: 'Week history',
    noHistory: 'No history available',
    displayName: 'Display name',
    role_admin: 'Administrator',
    role_reader: 'Reader',
    accountType: 'Account type',
  },
}

export type Lang = 'fr' | 'en'
export type T = typeof TRANSLATIONS.fr
