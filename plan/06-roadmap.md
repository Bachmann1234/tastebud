# Phase 6: Development Roadmap

## Development Philosophy

**Test-First Development**: All features are built by writing failing tests first, then implementing until tests pass. See `07-testing-strategy.md` for full details.

**Bug Fix Protocol**: Every bug MUST be reproduced with a failing test before fixing. No exceptions.

## MVP Timeline

### Day 1: Foundation
- [ ] Set up Next.js project with Tailwind
- [ ] Set up Biome (lint/format), Vitest, Playwright
- [ ] Set up Python scraper with uv + Ruff
- [ ] Set up GitHub repo with Actions CI (see `09-ci-tooling.md`)
- [ ] Set up pre-commit hooks (lefthook)
- [ ] Set up Supabase project and database schema
- [ ] Build and run scraper (with tests for parsing logic)
- [ ] Load restaurant data into database
- [ ] Write tests for API routes, then implement

### Day 2: Core Experience
- [ ] Write component tests for RestaurantCard, then implement
- [ ] Write tests for session creation/joining, then implement
- [ ] Write tests for vote submission logic, then implement
- [ ] Write tests for progress tracking, then implement

### Day 3: Polish & Launch
- [ ] Write tests for matching algorithm, then implement matches page
- [ ] Write E2E tests for full swipe flow
- [ ] Write E2E tests for multi-user matching
- [ ] Mobile testing and fixes
- [ ] Ensure CI passes, deploy to Vercel
- [ ] Test with real users (you and your wife!)

## Development Checklist

### Project Setup
```bash
# Create Next.js app
npx create-next-app@latest tastebud --typescript --tailwind --app
cd tastebud

# Install dependencies
npm install @supabase/supabase-js react-tinder-card lucide-react

# Install dev tooling (Astral-style: Biome for JS, similar to Ruff)
npm install -D @biomejs/biome lefthook

# Install test dependencies
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @playwright/test

# Set up Playwright browsers
npx playwright install

# Set up Biome
npx biome init

# Set up pre-commit hooks
npx lefthook install

# Set up environment
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial project setup"
gh repo create tastebud --private --source=. --push
```

### Supabase Setup
1. Create project at supabase.com
2. Run SQL from 02-data-model.md
3. Enable Row Level Security
4. Copy API keys to .env.local

### Scraper Setup
```bash
cd scraper

# Initialize with uv (Astral's package manager)
uv init
uv add requests beautifulsoup4 lxml
uv add --dev pytest ruff

# Run scraper
uv run python scrape.py
uv run python load_to_supabase.py

# Verify linting passes
uv run ruff check .
uv run ruff format --check .
```

## File Structure

```
/tastebud
├── /app
│   ├── /api
│   │   └── /sessions
│   │       ├── route.ts
│   │       └── route.test.ts       # API tests co-located
│   ├── /s/[sessionId]
│   │   ├── /page.tsx
│   │   ├── /swipe/page.tsx
│   │   └── /matches/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── /components
│   ├── RestaurantCard.tsx
│   ├── RestaurantCard.test.tsx     # Component tests co-located
│   ├── SwipeContainer.tsx
│   ├── SwipeContainer.test.tsx
│   ├── MatchCard.tsx
│   ├── ProgressBar.tsx
│   └── ShareButton.tsx
├── /lib
│   ├── supabase.ts
│   ├── types.ts
│   ├── matching.ts
│   ├── matching.test.ts            # Unit tests co-located
│   └── api.ts
├── /e2e                            # End-to-end tests
│   ├── session-create.spec.ts
│   ├── swipe-flow.spec.ts
│   └── multi-user-matching.spec.ts
├── /test                           # Test utilities
│   ├── setup.ts
│   ├── mocks/
│   │   └── supabase.ts
│   └── fixtures/
│       └── restaurants.ts
├── /scraper
│   ├── scrape.py
│   ├── scrape_test.py              # Scraper tests
│   ├── load_to_supabase.py
│   └── restaurants.json
├── vitest.config.ts
├── playwright.config.ts
└── /plan
    └── *.md
```

## Automated Test Coverage

Tests written BEFORE implementation (test-first):

### Unit Tests (Vitest)
- [ ] `matching.test.ts` - Match algorithm logic
- [ ] `session.test.ts` - Session creation/validation
- [ ] `vote.test.ts` - Vote recording and retrieval

### Integration Tests (Vitest)
- [ ] `api/sessions/route.test.ts` - Session API endpoints
- [ ] `api/sessions/[id]/vote/route.test.ts` - Vote API endpoints
- [ ] `api/sessions/[id]/matches/route.test.ts` - Match API endpoints

### Component Tests (React Testing Library)
- [ ] `RestaurantCard.test.tsx` - Displays data, handles interactions
- [ ] `SwipeContainer.test.tsx` - Manages card deck, fires events
- [ ] `MatchCard.test.tsx` - Displays match info

### E2E Tests (Playwright)
- [ ] Create session and get shareable link
- [ ] Join session via link
- [ ] Complete full swipe flow
- [ ] Two users match on same restaurant
- [ ] Rejoin session and see previous progress

### Device Testing (Manual)
- [ ] iPhone Safari
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Firefox

### Edge Case Tests (Automated)
- [ ] Same name joining twice → returns existing member
- [ ] Rejoining after closing browser → restores progress
- [ ] 100+ restaurants → no performance degradation
- [ ] Session expiry → appropriate error message
- [ ] Network failure during vote → retry/recovery

## Deployment

### Vercel Setup
1. Connect GitHub repo
2. Add environment variables
3. Deploy

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Domain (Optional)
- tastebud.app
- restaurantmatch.com
- dinnerswipe.com

## Post-MVP Enhancements

### Priority 1 (High Impact, Low Effort)
- [ ] Restaurant photos from Google Places
- [ ] Filter by cuisine/neighborhood before swiping
- [ ] "Undo" last swipe button

### Priority 2 (Nice to Have)
- [ ] OpenTable integration for booking
- [ ] Map view of matches
- [ ] Export matches to list/email

### Priority 3 (Future Versions)
- [ ] User accounts
- [ ] Save favorite restaurants
- [ ] Multiple cities
- [ ] Non-restaurant-week mode
- [ ] AI recommendations based on swipe patterns

## Legal Considerations

### Scraping
- Restaurant Week data is for personal use
- Don't redistribute raw data
- Credit source appropriately
- Be prepared for site structure changes

### Restaurant Data
- Menus and prices are public information
- Consider reaching out to Restaurant Week Boston for official partnership

## Success Metrics

For this personal project:
- ✅ You and your wife can use it
- ✅ You find restaurants you both want to try
- ✅ It's faster than going through the list manually
- ✅ Friends want to use it too

## Known Limitations (MVP)

- No photos (unless we add Google Places)
- No filtering during swiping
- Must complete all restaurants to see matches
- No account recovery if localStorage cleared
- Only works for Restaurant Week Boston
