'use client'

import { useState } from 'react'
import { TRANSLATIONS, Lang } from '@/lib/utils'
import type { Player } from '@/types'

interface Props {
  players: Player[]
  lang: Lang
  onClose: () => void
  onSaved: () => void
}

export default function CreateUserModal({ players, lang, onClose, onSaved }: Props) {
  const t = TRANSLATIONS[lang]
  const [role, setRole] = useState<'admin' | 'reader'>('reader')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [birthdate, setBirthdate] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isReader = role === 'reader'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (isReader && !birthdate) {
      setError(lang === 'fr' ? 'Date de naissance requise pour un compte lecteur.' : 'Birth date required for reader account.')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        role,
        birthdate: isReader ? birthdate : null,
        playerId: isReader ? selectedPlayerId || null : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || t.error)
      setSaving(false)
      return
    }

    setSuccess(lang === 'fr' ? `Compte "${username}" créé avec succès.` : `Account "${username}" created successfully.`)
    setUsername('')
    setDisplayName('')
    setPassword('')
    setBirthdate('')
    setSelectedPlayerId('')
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">👤 {t.createUser}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Role toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t.accountType}</label>
            <div className="flex gap-2">
              {(['reader', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    role === r
                      ? 'bg-amber-400/10 border-amber-400 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {r === 'reader' ? t.role_reader : t.role_admin}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t.username}</label>
            <input
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder={lang === 'fr' ? 'Pseudo de connexion' : 'Login username'}
            />
          </div>

          {isReader && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t.displayName}</label>
              <input
                className="input-field"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={lang === 'fr' ? 'Nom affiché dans le tableau' : 'Name shown in leaderboard'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t.password}</label>
            <div className="relative">
              <input
                className="input-field pr-16"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
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
              <p className="text-xs text-amber-400 mt-1">
                {lang === 'fr' ? '🔑 Mot de passe:' : '🔑 Password:'} {password}
              </p>
            )}
          </div>

          {isReader && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t.birthdate}</label>
                <input
                  className="input-field"
                  type="date"
                  value={birthdate}
                  onChange={e => setBirthdate(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {lang === 'fr' ? 'Lier à un joueur (optionnel)' : 'Link to player (optional)'}
                </label>
                <select
                  className="input-field"
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">{lang === 'fr' ? '— Aucun —' : '— None —'}</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-green-400 text-sm">
              {success}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t.cancel}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t.loading : t.createUser}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
