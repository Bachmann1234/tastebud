# Phase 7: Testing Strategy

## Core Principle: Test First

This project follows a **test-first development approach**:

1. **New Features**: Write failing tests that define expected behavior, then implement until tests pass
2. **Bug Fixes**: Reproduce the bug with a failing test first, then fix until the test passes
3. **Refactoring**: Ensure tests pass before and after changes

## Bug Fix Protocol

**Every bug fix MUST follow this process:**

```
1. Reproduce the bug manually
2. Write a failing test that captures the bug
3. Verify the test fails for the right reason
4. Fix the bug
5. Verify the test passes
6. Commit test and fix together
```

### Example: Bug Fix Workflow

```typescript
// Bug report: "Votes aren't counted when user rejoins session"

// Step 1: Write failing test FIRST
describe('vote persistence', () => {
  it('should retain votes when member rejoins with same name', async () => {
    // Arrange
    const session = await createSession();
    const member = await joinSession(session.id, 'Alice');
    await submitVote(member.token, restaurantId, true);

    // Simulate rejoin (new token, same name)
    const rejoinedMember = await joinSession(session.id, 'Alice');

    // Act
    const votes = await getVotesForMember(rejoinedMember.id);

    // Assert - this will FAIL until bug is fixed
    expect(votes).toHaveLength(1);
    expect(votes[0].restaurantId).toBe(restaurantId);
  });
});

// Step 2: Run test, confirm it fails
// Step 3: Fix the bug in the code
// Step 4: Run test, confirm it passes
// Step 5: Commit both test and fix
```

## Test Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest | Component logic, utilities, hooks |
| Integration | Vitest + Supabase | API routes, database queries |
| E2E | Playwright | Full user flows, cross-browser |
| Component | React Testing Library | UI components in isolation |

## Project Structure

```
/tastebud
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── restaurants/
│   │       │   ├── route.ts
│   │       │   └── route.test.ts
│   │       └── sessions/
│   │           ├── route.ts
│   │           ├── route.test.ts
│   │           └── [id]/
│   │               ├── route.ts / route.test.ts
│   │               ├── join/route.ts / route.test.ts
│   │               ├── vote/route.ts / route.test.ts
│   │               └── matches/route.ts / route.test.ts
│   ├── components/
│   │   ├── LandingPage.tsx
│   │   ├── LandingPage.test.tsx
│   │   ├── RestaurantCard.tsx
│   │   └── RestaurantCard.test.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   ├── api/
│   │   └── supabase/
│   └── test/
│       └── setup.ts               # @testing-library/jest-dom/vitest
├── e2e/                            # Playwright specs (future)
└── vitest.config.ts
```

## Test Categories

### Unit Tests
Pure functions, no external dependencies.

```typescript
// lib/matching.test.ts
import { findMatches, calculateApprovalRate } from './matching';

describe('findMatches', () => {
  it('returns empty array when no votes exist', () => {
    const result = findMatches([], []);
    expect(result).toEqual([]);
  });

  it('returns restaurant when all members voted yes', () => {
    const votes = [
      { memberId: '1', restaurantId: 42, vote: true },
      { memberId: '2', restaurantId: 42, vote: true },
    ];
    const members = [{ id: '1' }, { id: '2' }];

    const result = findMatches(votes, members);

    expect(result).toContainEqual({ restaurantId: 42, unanimous: true });
  });

  it('excludes restaurant when any member voted no', () => {
    const votes = [
      { memberId: '1', restaurantId: 42, vote: true },
      { memberId: '2', restaurantId: 42, vote: false },
    ];
    const members = [{ id: '1' }, { id: '2' }];

    const result = findMatches(votes, members);

    expect(result.find(m => m.restaurantId === 42)).toBeUndefined();
  });
});
```

### Integration Tests
Tests that hit the database (using test database or mocks).

```typescript
// app/api/sessions/route.test.ts
import { createMockSupabase } from '@/test/mocks';
import { POST } from './route';

describe('POST /api/sessions', () => {
  it('creates a session and returns share URL', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Date Night' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.shareUrl).toMatch(/\/s\/[a-f0-9-]+$/);
  });

  it('creates session with default name when none provided', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.name).toBe('Restaurant Week Session');
  });
});
```

### Component Tests
UI behavior without full app context.

```typescript
// components/RestaurantCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RestaurantCard } from './RestaurantCard';

const mockRestaurant = {
  id: 1,
  name: 'Test Restaurant',
  cuisine: ['Italian'],
  neighborhood: 'Back Bay',
  dinnerPrice: 42,
  menu: { dinner: { courses: [] } },
};

describe('RestaurantCard', () => {
  it('displays restaurant name and details', () => {
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={() => {}} />);

    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText(/Italian/)).toBeInTheDocument();
    expect(screen.getByText(/Back Bay/)).toBeInTheDocument();
    expect(screen.getByText(/\$42/)).toBeInTheDocument();
  });

  it('calls onSwipe with "right" when like button clicked', async () => {
    const onSwipe = vi.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    await userEvent.click(screen.getByRole('button', { name: /like/i }));

    expect(onSwipe).toHaveBeenCalledWith('right');
  });
});
```

### E2E Tests
Full user journeys in real browser.

```typescript
// e2e/swipe-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Swipe Flow', () => {
  test('user can create session and swipe through restaurants', async ({ page }) => {
    // Create session
    await page.goto('/');
    await page.click('text=Create Session');
    await page.fill('[name="sessionName"]', 'Test Session');
    await page.click('text=Start');

    // Join with name
    await page.fill('[name="name"]', 'Alice');
    await page.click('text=Join');

    // Should see first restaurant
    await expect(page.locator('.restaurant-card')).toBeVisible();

    // Swipe right
    await page.click('[aria-label="Like"]');

    // Should advance to next restaurant
    await expect(page.locator('.progress')).toContainText('2 of');
  });

  test('matches appear when both users swipe right', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const alice = await context1.newPage();
    const bob = await context2.newPage();

    // Alice creates session
    await alice.goto('/');
    await alice.click('text=Create Session');
    const shareUrl = await alice.locator('.share-url').textContent();

    // Both join
    await alice.fill('[name="name"]', 'Alice');
    await alice.click('text=Join');

    await bob.goto(shareUrl!);
    await bob.fill('[name="name"]', 'Bob');
    await bob.click('text=Join');

    // Both swipe right on first restaurant
    await alice.click('[aria-label="Like"]');
    await bob.click('[aria-label="Like"]');

    // Complete remaining (swipe left on all)
    // ... simplified for example

    // Check matches
    await alice.goto(shareUrl + '/matches');
    await expect(alice.locator('.match-card')).toHaveCount(1);
  });
});
```

## Test Database Strategy

### Option A: Supabase Test Project
- Separate Supabase project for tests
- Reset between test runs
- Slower but realistic

### Option B: Local Postgres + Testcontainers
```typescript
// test/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: PostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
  await runMigrations();
});

afterAll(async () => {
  await container.stop();
});
```

### Option C: Mock Supabase Client
```typescript
// test/mocks/supabase.ts
export const createMockSupabase = () => ({
  from: (table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
  }),
});
```

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run unit and integration tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Coverage Requirements

| Type | Minimum | Target |
|------|---------|--------|
| Unit (lib/) | 80% | 95% |
| Integration (api/) | 70% | 85% |
| Components | 60% | 80% |
| E2E | Critical paths | All user flows |

## Test Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Definition of Done

A feature/fix is complete when:

- [ ] Failing test written first (for bugs)
- [ ] All new code has corresponding tests
- [ ] All tests pass locally
- [ ] CI pipeline passes
- [ ] No decrease in coverage percentage
- [ ] E2E test added for new user-facing features
