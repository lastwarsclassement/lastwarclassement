'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toEmailFormat } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const t = {
    fr: {
      title: 'Last War',
      subtitle: 'Classement Alliance',
      username: 'Pseudo',
      password: 'Mot de passe',
      birthdate: 'Date de naissance',
      login: 'Se connecter',
      loading: 'Connexion...',
      show: 'Afficher',
      hide: 'Masquer',
      errorInvalid: 'Pseudo ou mot de passe incorrect',
      errorBirthdate: 'Date de naissance incorrecte',
      note: 'Pour les lecteurs : renseignez votre date de naissance',
    },
    en: {
      title: 'Last War',
      subtitle: 'Alliance Leaderboard',
      username: 'Username',
      password: 'Password',
      birthdate: 'Birthday',
      login: 'Login',
      loading: 'Signing in...',
      show: 'Show',
      hide: 'Hide',
      errorInvalid: 'Invalid username or password',
      errorBirthdate: 'Incorrect birth date',
      note: 'Readers: please enter your birth date',
    },
  }[lang]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const email = toEmailFormat(username)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError(t.errorInvalid)
      setLoading(false)
      return
    }

    // Fetch profile to check role and birth_date
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, player_id')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'reader' && profile.player_id) {
      const { data: player } = await supabase
        .from('players')
        .select('birth_date')
        .eq('id', profile.player_id)
        .single()

      if (player && birthdate) {
        const expected = player.birth_date // format: YYYY-MM-DD
        if (birthdate !== expected) {
          await supabase.auth.signOut()
          setError(t.errorBirthdate)
          setLoading(false)
          return
        }
      } else if (!birthdate) {
        await supabase.auth.signOut()
        setError(t.errorBirthdate)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">
        {/* Lang toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors border border-slate-700 rounded-full px-3 py-1"
          >
            {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
          </button>
        </div>

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gold-gradient mb-4">
            <span className="text-2xl">⚔️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{t.title}</h1>
          <p className="text-slate-400 mt-1">{t.subtitle}</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t.username}</label>
              <input
                className="input-field"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t.password}</label>
              <div className="relative">
                <input
                  className="input-field pr-16"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-amber-400 px-2 py-1"
                >
                  {showPassword ? t.hide : t.show}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t.birthdate} <span className="text-slate-500 text-xs">({t.note})</span>
              </label>
              <input
                className="input-field"
                type="date"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? t.loading : t.login}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
