# TasteBud Project Guidelines

## Project Overview

TasteBud is a restaurant discovery app for Boston Restaurant Week. It has two main components:

1. **Frontend** (root): Next.js 16 app with React 19, Supabase backend
2. **Scraper** (`/scraper`): Python scraper for restaurantweekboston.com

## Commands

### Frontend (Node.js)
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Biome check
npm run lint:fix     # Biome auto-fix
npm run test         # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:e2e     # Playwright E2E tests
```

### Scraper (Python)
```bash
cd scraper
source .venv/bin/activate    # Always use virtualenv
uv run pytest tests/ -v      # Run tests
python -m scraper.cli -v     # Full scrape
python -m scraper.cli --pages 1 --use-cache -v  # Dev mode
```

## Code Style

### TypeScript/JavaScript
- Use Biome for formatting and linting
- No ESLint rules override Biome

### Python
- Use Ruff for formatting and linting (line-length: 100)
- Python 3.12+ required
- Use dataclasses for models
- Type hints throughout

## Architecture Notes

### Scraper
- Rate limit: 1.5s between requests (be respectful)
- Cache HTML in `data/raw/` for debugging
- Menu data loaded via AJAX from `/fetch/{slug}/{meal}/`
- Output goes to `data/restaurants.json`

### Frontend
- Supabase for database (see `.env.example` for config)
- Tailwind CSS v4 for styling

## Git Workflow

- Lefthook runs pre-commit hooks (biome, ruff)
- Pre-push runs vitest
- Create feature branches from `main`
