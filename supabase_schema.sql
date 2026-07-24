-- ============================================================
-- LAST WAR CLASSEMENT — Schéma de base de données Supabase
-- ============================================================

-- Table des joueurs (les 100 participants au classement)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des profils utilisateurs (comptes de connexion)
-- Liée à auth.users de Supabase
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reader')),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des semaines
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('push', 'eco', 'push_control')) DEFAULT 'push',
  status TEXT NOT NULL CHECK (status IN ('active', 'validated')) DEFAULT 'active',
  frozen_dates DATE[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_number, year)
);

-- Table des scores quotidiens
CREATE TABLE daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  vs_score BIGINT,
  contribution_score BIGINT,
  points_earned INTEGER NOT NULL DEFAULT 0,
  week_type TEXT CHECK (week_type IN ('push', 'eco', 'push_control', 'gel')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, player_id, score_date)
);

-- Table des contributions d'alliance hebdomadaires
CREATE TABLE weekly_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  points INTEGER NOT NULL CHECK (points IN (10, 6, 3)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, player_id)
);

-- Table des sanctions manuelles
CREATE TABLE sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT -5,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des classements hebdomadaires validés
CREATE TABLE weekly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  role TEXT CHECK (role IN ('pilot', 'vip')),
  base_score_next_week INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, player_id)
);

-- Table de base score par semaine (score de départ de chaque joueur)
CREATE TABLE player_week_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  base_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, player_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_week_base ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour utilisateurs authentifiés
CREATE POLICY "Authenticated can read players" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read weeks" ON weeks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read daily_scores" ON daily_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read weekly_contributions" ON weekly_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read sanctions" ON sanctions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read weekly_rankings" ON weekly_rankings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read player_week_base" ON player_week_base FOR SELECT TO authenticated USING (true);

-- Profils : chacun lit le sien
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Admins : accès complet (écriture)
CREATE POLICY "Admins can insert players" ON players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update players" ON players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert weeks" ON weeks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update weeks" ON weeks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert daily_scores" ON daily_scores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update daily_scores" ON daily_scores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert weekly_contributions" ON weekly_contributions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete weekly_contributions" ON weekly_contributions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert sanctions" ON sanctions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete sanctions" ON sanctions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert weekly_rankings" ON weekly_rankings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert player_week_base" ON player_week_base FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update player_week_base" ON player_week_base FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins peuvent lire tous les profils
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- TRIGGER : création automatique du profil à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, role, player_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'reader'),
    (NEW.raw_user_meta_data->>'player_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- MIGRATION : jours "gel" (à exécuter sur une base existante)
-- ============================================================

ALTER TABLE weeks ADD COLUMN IF NOT EXISTS frozen_dates DATE[] NOT NULL DEFAULT '{}';

ALTER TABLE daily_scores DROP CONSTRAINT IF EXISTS daily_scores_week_type_check;
ALTER TABLE daily_scores ADD CONSTRAINT daily_scores_week_type_check CHECK (week_type IN ('push', 'eco', 'gel'));

-- ============================================================
-- MIGRATION : mode "push control" (à exécuter sur une base existante)
-- ============================================================

ALTER TABLE weeks DROP CONSTRAINT IF EXISTS weeks_type_check;
ALTER TABLE weeks ADD CONSTRAINT weeks_type_check CHECK (type IN ('push', 'eco', 'push_control'));

ALTER TABLE daily_scores DROP CONSTRAINT IF EXISTS daily_scores_week_type_check;
ALTER TABLE daily_scores ADD CONSTRAINT daily_scores_week_type_check CHECK (week_type IN ('push', 'eco', 'push_control', 'gel'));

-- ============================================================
-- MIGRATION : onglet "Event DS Vendredi" (à exécuter sur dev et prod)
-- ============================================================

CREATE TABLE event_ds_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  t1_power NUMERIC,
  event_a_status TEXT NOT NULL DEFAULT 'absent' CHECK (event_a_status IN ('present', 'remplacant', 'absent')),
  event_b_status TEXT NOT NULL DEFAULT 'absent' CHECK (event_b_status IN ('present', 'remplacant', 'absent')),
  vocal BOOLEAN NOT NULL DEFAULT false,
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, player_id),
  CHECK ((event_a_status != 'present' OR event_b_status = 'absent') AND (event_b_status != 'present' OR event_a_status = 'absent'))
);

CREATE TABLE event_ds_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  slot_index INTEGER NOT NULL DEFAULT 0,
  event TEXT NOT NULL CHECK (event IN ('A', 'B')),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, role_key, slot_index, event)
);

ALTER TABLE event_ds_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ds_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read event_ds_signups" ON event_ds_signups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read event_ds_assignments" ON event_ds_assignments FOR SELECT TO authenticated USING (true);

-- ============================================================
-- MIGRATION : puissance T1 décimale (à exécuter si event_ds_signups existe déjà)
-- ============================================================

ALTER TABLE event_ds_signups ALTER COLUMN t1_power TYPE NUMERIC USING t1_power::NUMERIC;

-- ============================================================
-- MIGRATION : onglet "Event Saison" (à exécuter sur dev et prod)
-- ============================================================

CREATE TABLE season_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE season_event_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES season_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, player_id)
);

ALTER TABLE season_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read season_events" ON season_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read season_event_responses" ON season_event_responses FOR SELECT TO authenticated USING (true);

-- ============================================================
-- MIGRATION : présent à un event impose absent à l'autre (à exécuter si event_ds_signups existe déjà)
-- ============================================================

ALTER TABLE event_ds_signups DROP CONSTRAINT IF EXISTS event_ds_signups_check;
ALTER TABLE event_ds_signups ADD CONSTRAINT event_ds_signups_check
  CHECK ((event_a_status != 'present' OR event_b_status = 'absent') AND (event_b_status != 'present' OR event_a_status = 'absent'));
