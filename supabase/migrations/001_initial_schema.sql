-- TasteBud initial schema
-- Run via Supabase Dashboard SQL Editor

-- =============================================================================
-- RESTAURANTS (static data loaded from scraper)
-- =============================================================================
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cuisine TEXT[],
  neighborhood VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  website TEXT,
  detail_url TEXT,
  image_url TEXT,
  lunch_price INTEGER,
  dinner_price INTEGER,
  brunch_price INTEGER,
  menu JSONB,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION set_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_set_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION set_restaurants_updated_at();

-- =============================================================================
-- SESSIONS (group swiping sessions)
-- =============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- =============================================================================
-- SESSION MEMBERS (participants, no auth required)
-- =============================================================================
CREATE TABLE session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, name)
);

-- =============================================================================
-- VOTES (individual swipe decisions)
-- =============================================================================
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES session_members(id) ON DELETE CASCADE,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, restaurant_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_votes_member ON votes(member_id);
CREATE INDEX idx_votes_restaurant ON votes(restaurant_id);
CREATE INDEX idx_session_members_session ON session_members(session_id);
CREATE INDEX idx_restaurants_neighborhood ON restaurants(neighborhood);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Restaurants: public read-only (loader uses service role key to bypass RLS)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read restaurants"
  ON restaurants FOR SELECT
  USING (true);

-- Sessions: permissive read/write (no-auth app)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access sessions"
  ON sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Session members: permissive read/write
ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access session_members"
  ON session_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- Votes: permissive read/write
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access votes"
  ON votes FOR ALL
  USING (true)
  WITH CHECK (true);
