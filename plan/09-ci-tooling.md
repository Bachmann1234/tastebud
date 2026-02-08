# CI & Tooling

## Overview

All code must pass formatting, linting, and tests before merge. GitHub Actions enforces this on every PR.

## Tooling by Language

### Python (Scraper)

| Tool | Purpose | From |
|------|---------|------|
| **uv** | Package management, virtualenv | Astral |
| **ruff** | Linting + formatting | Astral |
| **pytest** | Testing | Community |

```toml
# pyproject.toml
[project]
name = "tastebud-scraper"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31",
    "beautifulsoup4>=4.12",
    "lxml>=5.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
    "ruff>=0.4",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "UP",  # pyupgrade
]

[tool.ruff.format]
quote-style = "double"
```

**Commands:**
```bash
uv sync                  # Install dependencies
uv run ruff check .      # Lint
uv run ruff format .     # Format
uv run pytest            # Test
```

### TypeScript/JavaScript (Frontend)

| Tool | Purpose |
|------|---------|
| **Biome** | Linting + formatting (fast, like Ruff for JS) |
| **Vitest** | Unit/integration tests |
| **Playwright** | E2E tests |

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.7.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

**Commands:**
```bash
npm run lint          # biome check .
npm run format        # biome format . --write
npm run test          # vitest
npm run test:e2e      # playwright test
```

## Package Scripts

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check . --write",
    "format": "biome format . --write",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run test"
  }
}
```

## Pre-commit Hooks

Using `lefthook` (fast, simple):

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{js,ts,tsx,json}"
      run: npx biome check --staged
    ruff:
      glob: "*.py"
      run: cd scraper && uv run ruff check {staged_files}
    ruff-format:
      glob: "*.py"
      run: cd scraper && uv run ruff format --check {staged_files}

pre-push:
  commands:
    test:
      run: npm run test
```

**Setup:**
```bash
npm install -D lefthook
npx lefthook install
```

## GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Lint & Format Check
        run: npx biome check .

      - name: Unit Tests
        run: npm test

      - name: Build
        run: npm run build

  frontend-e2e:
    name: Frontend E2E
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  scraper:
    name: Scraper
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./scraper
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v2

      - name: Set up Python
        run: uv python install 3.11

      - name: Install dependencies
        run: uv sync

      - name: Lint
        run: uv run ruff check .

      - name: Format Check
        run: uv run ruff format --check .

      - name: Test
        run: uv run pytest
```

## Branch Protection

Configure in GitHub repo settings:

- Require status checks before merge:
  - `Frontend`
  - `Frontend E2E`
  - `Scraper`
- Require branches to be up to date
- Require conversation resolution

## File Structure

```
/tastebud
├── .github/
│   └── workflows/
│       └── ci.yml
├── biome.json
├── lefthook.yml
├── package.json
├── /scraper
│   ├── pyproject.toml
│   ├── uv.lock
│   └── ...
└── ...
```

## Verification Checklist

Before any PR is merged:

- [ ] `biome check .` passes (no lint/format errors)
- [ ] `npm test` passes (all unit tests green)
- [ ] `npm run test:e2e` passes (all E2E tests green)
- [ ] `ruff check .` passes (Python lint)
- [ ] `ruff format --check .` passes (Python format)
- [ ] `pytest` passes (scraper tests)
- [ ] Build succeeds (`npm run build`)

All enforced automatically by GitHub Actions.
