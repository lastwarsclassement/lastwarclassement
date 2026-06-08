'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Profile, Player } from '@/types'

interface Props {
  profile: Profile
  player: Player | null
  lang: Lang
  onClose: () => void
}

export default function ProfileModal({ profile, player, lang, onClose }: Props) {
  const t = TRANSLATIONS[lang]
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(lang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      const msg = data.error === 'PASSWORD_TOO_SHORT'
        ? (lang === 'fr' ? 'Mot de passe trop court (6 caractères min).' : 'Password too short (min 6 chars).')
        : data.error
      setError(msg)
      return
    }

    setSuccess(lang === 'fr' ? 'Mot de passe mis à jour.' : 'Password updated.')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">⚙️ {lang === 'fr' ? 'Mon profil' : 'My profile'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Profile info */}
        <div className="bg-slate-800/60 rounded-lg p-4 mb-5 space-y-3">
          {player && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-black font-bold text-lg">
                {player.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{player.display_name}</p>
                <p className="text-slate-400 text-xs">{lang === 'fr' ? 'Joueur Last War' : 'Last War player'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm pt-1 border-t border-slate-700">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">{lang === 'fr' ? 'Identifiant' : 'Username'}</p>
              <p className="text-white font-medium">{profile.username}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">{t.role}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border inline-block ${
                profile.role === 'admin'
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}>
                {profile.role === 'admin' ? t.role_admin : t.role_reader}
              </span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <form onSubmit={handleSavePassword}>
          <p className="text-sm font-medium text-slate-300 mb-3">
            {lang === 'fr' ? 'Changer le mot de passe' : 'Change password'}
          </p>
          <div className="space-y-3 mb-4">
            <div className="relative">
              <input
                className="input-field pr-16"
                type={showPassword ? 'text' : 'password'}
                placeholder={lang === 'fr' ? 'Nouveau mot de passe' : 'New password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-amber-400 px-2 py-1"
              >
                {showPassword ? t.hidePassword : t.showPassword}
              </button>
            </div>
            <input
              className="input-field"
              type={showPassword ? 'text' : 'password'}
              placeholder={lang === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-3">✓ {success}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">{t.cancel}</button>
            <button type="submit" className="btn-primary text-sm" disabled={saving || !password}>
              {saving ? t.loading : (lang === 'fr' ? 'Mettre à jour' : 'Update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
