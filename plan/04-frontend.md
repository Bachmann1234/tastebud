# Phase 4: Frontend

## Overview
Mobile-first React application with Tinder-style swipe interface.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Swipe Library**: react-tinder-card
- **State**: React hooks + Context
- **Icons**: Lucide React

## Page Structure

```
/app
  /page.tsx                 # Landing page - create session (implemented)
  /s/[sessionId]
    /page.tsx              # Join page - enter your name
    /swipe/page.tsx        # Main swiping interface
    /matches/page.tsx      # View matches
    /progress/page.tsx     # See everyone's progress
```

## Core Components

### RestaurantCard (implemented)
Display-only card showing restaurant info. Swipe behavior is handled by the parent SwipeContainer via react-tinder-card.

```tsx
interface RestaurantCardProps {
  restaurant: Restaurant;
}

// Card sections:
// 1. Image/header with restaurant name (gradient fallback when no image)
// 2. Quick info: cuisine tags, neighborhood, prices
// 3. Address
// 4. Menu preview (scrollable, courses with options)
```

**Layout:**
```
┌─────────────────────────────┐
│  [Image or Gradient Header] │
│       Restaurant Name       │
│    Italian • Back Bay       │
├─────────────────────────────┤
│  💰 Dinner: $42             │
│  📍 123 Main St             │
├─────────────────────────────┤
│  ┌─ MENU ─────────────────┐ │
│  │ First Course           │ │
│  │ • Burrata Salad        │ │
│  │ • Soup of the Day      │ │
│  │                        │ │
│  │ Second Course          │ │
│  │ • Grilled Salmon       │ │
│  │ • Beef Short Rib       │ │
│  └────────────────────────┘ │
├─────────────────────────────┤
│    ❌           ✓           │
│   NOPE        LIKE          │
└─────────────────────────────┘
```

### SwipeContainer
Manages the deck of cards and swipe gestures.

```tsx
interface SwipeContainerProps {
  restaurants: Restaurant[];
  onVote: (restaurantId: number, vote: boolean) => void;
  onComplete: () => void;
}

// Features:
// - Preloads next 3 cards
// - Handles touch and mouse gestures
// - Shows swipe direction feedback
// - Undo last swipe button
```

### ProgressBar
Shows session progress.

```tsx
// "12 of 107 restaurants"
// [████████░░░░░░░░░░░░] 11%
```

### MatchCard
Displays a matched restaurant.

```tsx
// Shows:
// - Restaurant summary
// - "Liked by: Alice, Bob"
// - Quick action buttons (reserve, share)
```

## User Flows

### Flow 1: Create Session
```
Landing Page
    │
    ▼
[Create New Session] button
    │
    ▼
Enter session name (optional)
    │
    ▼
Redirect to /s/{id}?creator=true
    │
    ▼
Enter your name
    │
    ▼
Start swiping (show share button prominently)
```

### Flow 2: Join Session
```
Receive link: tastebud.app/s/{id}
    │
    ▼
Enter your name
    │
    ▼
Start swiping
```

### Flow 3: Swiping
```
Load first restaurant
    │
    ├──▶ Swipe Right ──▶ Record YES vote ──┐
    │                                       │
    └──▶ Swipe Left ───▶ Record NO vote ───┤
                                            │
                              Load next restaurant
                                            │
                              (repeat until done)
                                            │
                                            ▼
                              Show "All Done!" screen
                              Link to matches
```

## Swipe Implementation

Using `react-tinder-card`:

```tsx
import TinderCard from 'react-tinder-card';

function SwipeContainer() {
  const onSwipe = (direction: string, restaurant: Restaurant) => {
    const vote = direction === 'right';
    submitVote(restaurant.id, vote);
  };

  return (
    <div className="relative h-[600px]">
      {restaurants.map((restaurant, index) => (
        <TinderCard
          key={restaurant.id}
          onSwipe={(dir) => onSwipe(dir, restaurant)}
          preventSwipe={['up', 'down']}
          className="absolute"
        >
          <RestaurantCard restaurant={restaurant} />
        </TinderCard>
      ))}
    </div>
  );
}
```

## Mobile Considerations

- Touch-first design
- Large tap targets (48px minimum)
- Swipe gestures should feel natural
- Handle notch/safe areas
- Offline indicator
- Pull-to-refresh on matches

## State Management

```typescript
interface SessionState {
  sessionId: string;
  memberId: string;
  memberName: string;

  // Restaurants
  restaurants: Restaurant[];
  currentIndex: number;
  votedIds: Set<number>;

  // Progress
  progress: {
    self: number;
    others: { name: string; count: number }[];
  };

  // Matches
  matches: Match[];
}
```

## Animations

- Card swipe with physics (spring animation)
- Like/Nope stamp appearing on swipe
- Card stack depth effect (scale + offset)
- Match celebration (confetti? subtle glow?)
- Progress bar fill animation

## Responsive Breakpoints

```css
/* Mobile first */
.card { width: 100%; max-width: 400px; }

/* Tablet+ */
@media (min-width: 768px) {
  .card { width: 400px; }
  /* Side-by-side layout possible */
}
```

## Accessibility

- Keyboard navigation (arrow keys to swipe)
- Screen reader announcements for swipes
- Reduced motion option
- High contrast mode support
- Focus indicators
