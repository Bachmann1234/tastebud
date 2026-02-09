# TasteBud

Tinder for Restaurant Week — a swipe-based app for couples and groups to discover and match on Restaurant Week Boston restaurants.

## How It Works

1. **Create** a session from the landing page
2. **Share** the link with friends
3. **Swipe** through restaurant cards (right = interested, left = pass)
4. **Match** — see which restaurants everyone agreed on

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Scraper | Python, BeautifulSoup, lxml |
| Tooling | Biome (JS), Ruff (Python), Lefthook |
| Testing | Vitest, React Testing Library, Playwright |

## Getting Started

```bash
npm install
cp .env.example .env.local   # Fill in Supabase keys
npm run dev                   # http://localhost:3000
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Biome check
npm run lint:fix     # Biome auto-fix
npm run test         # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:e2e     # Playwright E2E tests
```

See [CLAUDE.md](CLAUDE.md) for scraper and loader commands.

## Project Structure

```
src/
  app/
    page.tsx                          # Landing page
    api/
      restaurants/route.ts            # GET restaurants
      sessions/
        route.ts                      # POST create session
        [id]/
          route.ts                    # GET session info
          join/route.ts               # POST join session
          vote/route.ts               # POST submit vote
          matches/route.ts            # GET matches
  components/
    LandingPage.tsx                   # Session creation form
    RestaurantCard.tsx                # Restaurant display card
  lib/
    types.ts                          # Shared TypeScript types
    api/                              # API helpers (auth, errors)
    supabase/                         # Supabase client
scraper/                              # Python scraper package
supabase/migrations/                  # Database schema
```
