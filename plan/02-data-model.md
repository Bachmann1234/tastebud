# Phase 2: Data Model

## Overview
Database schema for storing restaurants, sessions, and votes.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   restaurants   │       │    sessions     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK, UUID)   │
│ slug            │       │ name            │
│ name            │       │ created_at      │
│ data (JSONB)    │       │ expires_at      │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌─────────────────┐  │
         │    │ session_members │  │
         │    ├─────────────────┤  │
         │    │ id (PK)         │  │
         │    │ session_id (FK) │◀─┘
         │    │ name            │
         │    │ created_at      │
         │    └────────┬────────┘
         │             │
         │    ┌────────▼────────┐
         │    │     votes       │
         │    ├─────────────────┤
         └───▶│ id (PK)         │
              │ session_id (FK) │
              │ member_id (FK)  │
              │ restaurant_id   │
              │ vote (boolean)  │
              │ created_at      │
              └─────────────────┘
```

## Table Definitions

### restaurants
Static data, loaded once from scraper.

```sql
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cuisine TEXT[],
  neighborhood VARCHAR(100),
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  lunch_price INTEGER,
  dinner_price INTEGER,
  menu JSONB,
  features TEXT[],
  image_url TEXT,
  reservation_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### sessions
A group swiping session.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```

### session_members
Participants in a session (no auth required).

```sql
CREATE TABLE session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, name)
);
```

### votes
Individual swipe decisions.

```sql
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES session_members(id) ON DELETE CASCADE,
  restaurant_id INTEGER REFERENCES restaurants(id),
  vote BOOLEAN NOT NULL, -- true = right swipe, false = left swipe
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(member_id, restaurant_id)
);
```

## Key Queries

### Get matches for a session
Restaurants where ALL members voted yes.

```sql
SELECT r.*, COUNT(v.id) as yes_votes
FROM restaurants r
JOIN votes v ON v.restaurant_id = r.id
WHERE v.session_id = $1 AND v.vote = true
GROUP BY r.id
HAVING COUNT(v.id) = (
  SELECT COUNT(*) FROM session_members WHERE session_id = $1
)
ORDER BY r.name;
```

### Get next restaurant for a member
Restaurants they haven't voted on yet.

```sql
SELECT r.*
FROM restaurants r
WHERE r.id NOT IN (
  SELECT restaurant_id FROM votes WHERE member_id = $1
)
ORDER BY r.name
LIMIT 1;
```

### Get session progress
```sql
SELECT
  sm.name,
  COUNT(v.id) as votes_cast,
  (SELECT COUNT(*) FROM restaurants) as total_restaurants
FROM session_members sm
LEFT JOIN votes v ON v.member_id = sm.id
WHERE sm.session_id = $1
GROUP BY sm.id, sm.name;
```

## Indexes
```sql
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_votes_member ON votes(member_id);
CREATE INDEX idx_session_members_session ON session_members(session_id);
```

## Supabase Row Level Security (Optional)
For basic security without full auth:

```sql
-- Anyone can read restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON restaurants FOR SELECT USING (true);

-- Session data accessible via session_id in request
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session access" ON votes
  FOR ALL USING (session_id = current_setting('app.session_id')::uuid);
```

## Data Migration
Script to load scraped JSON into database:

```python
import json
from supabase import create_client

with open('data/restaurants.json') as f:
    restaurants = json.load(f)

for r in restaurants:
    supabase.table('restaurants').insert({
        'slug': r['slug'],
        'name': r['name'],
        'cuisine': r['cuisine'],
        # ... etc
    }).execute()
```
