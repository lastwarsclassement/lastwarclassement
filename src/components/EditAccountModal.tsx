'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Profile, Player } from '@/types'

interface Props {
  profile: Profile
  player: Player | null
  players: Player[]
  linkedPlayerIds: Set<string>
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function EditAccountModal({ profile, player, players, linkedPlayerIds, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]
  const [role, setRole] = useState<'reader' | 'admin'>(profile.role as 'reader' | 'admin')
  const [playerId, setPlayerId] = useState(profile.player_id ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availablePlayers = players.filter(p => p.id === playerId || !linkedPlayerIds.has(p.id))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body: Record<string, string | null> = { profileId: profile.id, role, playerId: playerId || null }
    if (password) body.password = password

    const res = await fetch('/api/admin/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t.error)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            ✏️ {lang === 'fr' ? 'Modifier le compte' : 'Edit account'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Account info */}
        <div className="bg-slate-800/60 rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{profile.username}</p>
            {player && <p className="text-slate-400 text-xs">{player.display_name}</p>}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.role}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('reader')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  role === 'reader'
                    ? 'bg-slate-600 border-slate-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {t.role_reader}
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  role === 'admin'
                    ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-400/50'
                }`}
              >
                {t.role_admin}
              </button>
            </div>
          </div>

          {/* Linked player */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              {lang === 'fr' ? 'Joueur lié' : 'Linked player'}
            </label>
            <select
              className="input-field"
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
            >
              <option value="">{lang === 'fr' ? '— Aucun —' : '— None —'}</option>
              {availablePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          </div>

          {/* Password (optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {lang === 'fr' ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'New password (leave blank to keep current)'}
            </label>
            <div className="relative">
              <input
                className="input-field pr-16"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-amber-400 px-2 py-1"
              >
                {showPassword ? t.hidePassword : t.showPassword}
              </button>
            </div>
            {showPassword && password && (
              <p className="text-xs text-amber-400 mt-1">🔑 {password}</p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">{t.cancel}</button>
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? t.loading : (lang === 'fr' ? 'Enregistrer' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
