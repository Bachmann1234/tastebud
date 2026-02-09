# TasteBud - Project Overview

## Concept
"Tinder for Restaurant Week" - A swipe-based interface for couples/groups to discover and match on Restaurant Week Boston restaurants.

## Core User Flow
1. User creates or joins a session via shareable link
2. User swipes through restaurant cards (menu, location, price)
3. Swipe right = interested, swipe left = not interested
4. After all participants finish, view matched restaurants (everyone swiped right)

## Technical Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scraper   │────▶│  Database   │◀────│   Backend   │
│  (one-time) │     │ (restaurants│     │    (API)    │
└─────────────┘     │  + votes)   │     └──────┬──────┘
                    └─────────────┘            │
                                               │
                                        ┌──────▼──────┐
                                        │  Frontend   │
                                        │ (swipe UI)  │
                                        └─────────────┘
```

## Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Scraper | Python + BeautifulSoup | Simple, well-documented |
| Database | Supabase (Postgres) | Free tier, realtime, easy setup |
| Backend | Supabase + Edge Functions | Minimal server code needed |
| Frontend | Next.js 16 + React 19 | Fast development, easy deployment |
| Hosting | Vercel | Free, integrates with Next.js |

## MVP Scope
- [x] Scrape all Restaurant Week Boston data
- [x] Basic swipe UI with restaurant cards
- [x] Session creation with shareable links
- [x] Vote tracking per user per session (API complete, UI pending)
- [x] Match results page (API complete, UI pending)

## Future Enhancements
- User accounts / authentication
- Filtering (by cuisine, neighborhood, price)
- Restaurant photos from Google Places API
- OpenTable integration for booking matches
- "Maybe" pile for revisiting
- Chat/comments on matches
