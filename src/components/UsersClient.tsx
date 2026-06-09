'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Player, Profile } from '@/types'
import ProfileModal from './ProfileModal'
import EditAccountModal from './EditAccountModal'

interface Props {
  players: Player[]
  profiles: Profile[]
  currentProfile: Profile
}

export default function UsersClient({ players, profiles, currentProfile }: Props) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('fr')
  const t = TRANSLATIONS[lang]

  const [tab, setTab] = useState<'players' | 'accounts'>('players')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [search, setSearch] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const currentPlayer = players.find(p => p.id === currentProfile.player_id) ?? null

  // Add player form
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newBirthdate, setNewBirthdate] = useState('')
  const [newRole, setNewRole] = useState<'reader' | 'admin'>('reader')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingDemo, setAddingDemo] = useState(false)
  const [deletingDemo, setDeletingDemo] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filteredPlayers = players.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  )

  const filteredProfiles = profiles.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: newDisplayName,
        username: newUsername,
        birthdate: newBirthdate,
        createAccount: true,
        password: newPassword,
        role: newRole,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      const errorMap: Record<string, string> = {
        MISSING_FIELDS: lang === 'fr' ? 'Champs requis manquants.' : 'Missing required fields.',
        PASSWORD_REQUIRED: lang === 'fr' ? 'Mot de passe requis.' : 'Password required.',
      }
      setError(errorMap[data.error] || data.error || t.error)
      setSaving(false)
      return
    }

    const addedMsg = data.isActive
      ? (lang === 'fr' ? `Joueur "${newDisplayName}" ajouté et actif.` : `Player "${newDisplayName}" added and active.`)
      : (lang === 'fr' ? `Joueur "${newDisplayName}" ajouté (inactif — 100 actifs atteints).` : `Player "${newDisplayName}" added (inactive — 100 active slots full).`)
    setSuccess(addedMsg)
    setNewDisplayName('')
    setNewUsername('')
    setNewBirthdate('')
    setNewPassword('')
    setNewRole('reader')
    setShowPassword(false)
    setShowAddPlayer(false)
    setSaving(false)
    router.refresh()
  }

  async function handleToggleActive(player: Player) {
    const res = await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, isActive: !player.is_active }),
    })
    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'MAX_PLAYERS_REACHED') {
        setError(lang === 'fr' ? 'Maximum de 100 joueurs actifs atteint.' : 'Maximum of 100 active players reached.')
        return
      }
    }
    setError('')
    router.refresh()
  }

  const demoCount = players.filter(p => p.username.startsWith('demo_')).length

  async function handleDeleteDemo() {
    if (!demoCount) return
    const msg = lang === 'fr'
      ? `Supprimer les ${demoCount} joueurs démo ? Cette action est irréversible.`
      : `Delete ${demoCount} demo players? This cannot be undone.`
    if (!confirm(msg)) return
    setDeletingDemo(true)
    const res = await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteDemo: true }),
    })
    const data = await res.json()
    setDeletingDemo(false)
    if (res.ok) {
      setSuccess(lang === 'fr' ? `${data.count} joueurs démo supprimés.` : `${data.count} demo players deleted.`)
      router.refresh()
    } else {
      setError(data.error || t.error)
    }
  }

  async function handleDeletePlayer(player: Player) {
    const msg = lang === 'fr'
      ? `Supprimer définitivement "${player.display_name}" et toutes ses données ? Cette action est irréversible.`
      : `Permanently delete "${player.display_name}" and all their data? This cannot be undone.`
    if (!confirm(msg)) return
    const res = await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id }),
    })
    if (res.ok) router.refresh()
    else {
      const data = await res.json()
      setError(data.error || t.error)
    }
  }

  async function handleAddDemo() {
    if (!confirm(lang === 'fr'
      ? '100 joueurs démo vont être ajoutés. Continuer ?'
      : 'Add 100 demo players. Continue?'
    )) return
    setAddingDemo(true)
    const res = await fetch('/api/admin/players', { method: 'PUT' })
    const data = await res.json()
    setAddingDemo(false)
    if (res.ok) {
      setSuccess(lang === 'fr' ? `${data.count} joueurs démo ajoutés !` : `${data.count} demo players added!`)
      router.refresh()
    } else {
      setError(data.error || t.error)
    }
  }

  async function handleDeleteAccount(userId: string) {
    if (!confirm(lang === 'fr' ? 'Supprimer ce compte de connexion ?' : 'Delete this login account?')) return
    await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    router.refresh()
  }

  const getPlayerForProfile = (profile: Profile) =>
    profile.player_id ? players.find(p => p.id === profile.player_id) : null

  const activeCount = players.filter(p => p.is_active).length
  const inactiveCount = players.filter(p => !p.is_active).length

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-40" style={{
        background: 'linear-gradient(180deg, rgba(9,24,48,0.97) 0%, rgba(9,24,48,0.90) 100%)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid rgba(74,126,196,0.4)',
        height: '64px',
      }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <span className="logo-text text-lg hidden sm:block">Classement Last War</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/dashboard" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', color: '#fff' }}
               className="px-3 py-1 transition-colors hover:text-yellow-400">{t.dashboard}</a>
            <a href="/dashboard/users" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', color: '#fff' }}
               className="px-3 py-1 transition-colors hover:text-yellow-400">{lang === 'fr' ? 'Joueurs' : 'Players'}</a>
            <a href="/dashboard/history" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', color: '#fff' }}
               className="px-3 py-1 transition-colors hover:text-yellow-400">{t.history}</a>
            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="text-xs hover:text-yellow-400 rounded-full px-2 py-1 transition-colors"
              style={{ color: '#A8C4E8', border: '1px solid #2A4F8A' }}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            {currentPlayer && (
              <span className="text-sm hidden sm:block px-2" style={{ color: '#A8C4E8' }}>{currentPlayer.display_name}</span>
            )}
            <button
              onClick={() => setShowProfile(true)}
              className="p-1 transition-colors hover:text-yellow-400"
              style={{ color: '#5B7FA8' }}
              title={lang === 'fr' ? 'Paramètres du profil' : 'Profile settings'}
            >
              ⚙️
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <button onClick={() => router.back()} className="btn-secondary text-sm">
            ← {lang === 'fr' ? 'Retour' : 'Back'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="lw-title text-2xl">
              {lang === 'fr' ? 'Gestion des joueurs' : 'Player Management'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#5B7FA8' }}>
              {activeCount} {lang === 'fr' ? 'actifs' : 'active'}
              {inactiveCount > 0 && ` · ${inactiveCount} ${lang === 'fr' ? 'inactifs' : 'inactive'}`}
              {' · '}{profiles.length} {lang === 'fr' ? 'comptes' : 'accounts'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {activeCount >= 100 && (
              <span className="counter-badge">
                {lang === 'fr' ? '100/100 — max atteint' : '100/100 — max reached'}
              </span>
            )}
            <button
              onClick={handleAddDemo}
              disabled={addingDemo || activeCount >= 100}
              className="btn-secondary text-sm"
              title={activeCount >= 100 ? (lang === 'fr' ? 'Maximum de 100 joueurs atteint' : 'Maximum 100 players reached') : ''}
            >
              {addingDemo ? t.loading : `🎮 ${lang === 'fr' ? 'Équipe démo (100)' : 'Demo team (100)'}`}
            </button>
            {demoCount > 0 && (
              <button
                onClick={handleDeleteDemo}
                disabled={deletingDemo}
                className="btn-danger text-sm"
              >
                {deletingDemo ? t.loading : `🗑 ${lang === 'fr' ? `Effacer démo (${demoCount})` : `Clear demo (${demoCount})`}`}
              </button>
            )}
            <button
              onClick={() => {
                setNewDisplayName('')
                setNewUsername('')
                setNewBirthdate('')
                setNewPassword('')
                setNewRole('reader')
                setShowPassword(false)
                setError('')
                setSuccess('')
                setShowAddPlayer(true)
              }}
              className="btn-primary text-sm"
            >
              + {lang === 'fr' ? 'Ajouter un joueur' : 'Add player'}
            </button>
          </div>
        </div>

        {/* Add player form */}
        {showAddPlayer && (
          <div className="card p-5 mb-6 fade-in">
            <h2 className="text-white font-semibold mb-4">
              {lang === 'fr' ? 'Nouveau joueur' : 'New player'}
            </h2>
            <form onSubmit={handleAddPlayer}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {lang === 'fr' ? 'Pseudo Last War' : 'Last War Username'}
                  </label>
                  <input
                    className="input-field"
                    value={newUsername}
                    onChange={e => { setNewUsername(e.target.value); setNewDisplayName(e.target.value) }}
                    required
                    placeholder="Ex: DragonSlayer99"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{t.birthdate}</label>
                  <input
                    className="input-field"
                    type="date"
                    value={newBirthdate}
                    onChange={e => setNewBirthdate(e.target.value)}
                    required
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Role selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">{t.role}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('reader')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      newRole === 'reader'
                        ? 'bg-slate-600 border-slate-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {t.role_reader}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      newRole === 'admin'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-400/50'
                    }`}
                  >
                    {t.role_admin}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{t.password}</label>
                  <div className="relative">
                    <input
                      className="input-field pr-16"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-amber-400 px-2 py-1"
                    >
                      {showPassword ? t.hidePassword : t.showPassword}
                    </button>
                  </div>
                  {showPassword && newPassword && (
                    <p className="text-xs text-amber-400 mt-1">🔑 {newPassword}</p>
                  )}
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              {success && <p className="text-green-400 text-sm mb-3">✓ {success}</p>}

              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm" disabled={saving}>
                  {saving ? t.loading : (lang === 'fr' ? 'Ajouter' : 'Add')}
                </button>
                <button type="button" onClick={() => setShowAddPlayer(false)} className="btn-secondary text-sm">
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-4" style={{ borderBottom: '1px solid #2A4F8A' }}>
          {(['players', 'accounts'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`tab${tab === tabKey ? ' active' : ''}`}
            >
              {tabKey === 'players'
                ? `${lang === 'fr' ? 'Joueurs' : 'Players'} ${activeCount}/100`
                : `${lang === 'fr' ? 'Comptes' : 'Accounts'} (${profiles.length})`
              }
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            className="input-field max-w-xs"
            placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Players tab */}
        {tab === 'players' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    {lang === 'fr' ? 'Pseudo Last War' : 'Last War Username'}
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">
                    {t.birthdate}
                  </th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">
                    {lang === 'fr' ? 'Statut' : 'Status'}
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => {
                  return (
                    <tr key={player.id} className={`border-b border-slate-700/50 table-row-hover ${!player.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{player.display_name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                        {new Date(player.birth_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          player.is_active
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-slate-700 border-slate-600 text-slate-500'
                        }`}>
                          {player.is_active
                            ? (lang === 'fr' ? 'Actif' : 'Active')
                            : (lang === 'fr' ? 'Inactif' : 'Inactive')
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleToggleActive(player)}
                            disabled={!player.is_active && activeCount >= 100}
                            className="text-xs btn-secondary py-1 px-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!player.is_active && activeCount >= 100 ? (lang === 'fr' ? '100 actifs max atteint' : '100 active max reached') : ''}
                          >
                            {player.is_active
                              ? (lang === 'fr' ? 'Désactiver' : 'Disable')
                              : (lang === 'fr' ? 'Réactiver' : 'Reactivate')
                            }
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player)}
                            className="text-xs btn-danger py-1 px-2"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      {lang === 'fr' ? 'Aucun joueur trouvé' : 'No players found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Accounts tab */}
        {tab === 'accounts' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">{t.username}</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">
                    {lang === 'fr' ? 'Joueur lié' : 'Linked player'}
                  </th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">{t.role}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map(profile => {
                  const linkedPlayer = getPlayerForProfile(profile)
                  return (
                    <tr key={profile.id} className="border-b border-slate-700/50 table-row-hover">
                      <td className="px-4 py-3 text-white font-medium">{profile.username}</td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                        {linkedPlayer?.display_name || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          profile.role === 'admin'
                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                            : 'bg-slate-700 border-slate-600 text-slate-400'
                        }`}>
                          {profile.role === 'admin' ? t.role_admin : t.role_reader}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingProfile(profile)}
                            className="text-xs btn-secondary py-1 px-2"
                          >
                            ✏️ {lang === 'fr' ? 'Modifier' : 'Edit'}
                          </button>
                          {profile.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteAccount(profile.id)}
                              className="text-xs btn-danger py-1 px-2"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      {lang === 'fr' ? 'Aucun compte trouvé' : 'No accounts found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showProfile && (
        <ProfileModal
          profile={currentProfile}
          player={currentPlayer}
          lang={lang}
          onClose={() => setShowProfile(false)}
        />
      )}

      {editingProfile && (
        <EditAccountModal
          profile={editingProfile}
          player={players.find(p => p.id === editingProfile.player_id) ?? null}
          lang={lang}
          onClose={() => setEditingProfile(null)}
          onSaved={() => { setEditingProfile(null); router.refresh() }}
        />
      )}
    </div>
  )
}
