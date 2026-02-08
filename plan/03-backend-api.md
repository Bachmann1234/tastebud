# Phase 3: Backend API

## Overview
RESTful API for session management, voting, and match retrieval.

## API Endpoints

### Sessions

#### Create Session
```
POST /api/sessions
Body: { "name": "Date Night Picks" }
Response: {
  "id": "uuid-here",
  "name": "Date Night Picks",
  "shareUrl": "https://tastebud.app/s/uuid-here"
}
```

#### Get Session
```
GET /api/sessions/:id
Response: {
  "id": "uuid",
  "name": "Date Night Picks",
  "members": [
    { "id": "uuid", "name": "Alice", "progress": 45 },
    { "id": "uuid", "name": "Bob", "progress": 32 }
  ],
  "totalRestaurants": 107,
  "matchCount": 12
}
```

### Members

#### Join Session
```
POST /api/sessions/:id/join
Body: { "name": "Alice" }
Response: {
  "memberId": "uuid",
  "sessionId": "uuid",
  "token": "jwt-or-simple-token"
}
```
- Sets a cookie/localStorage token for future requests
- Returns error if name already taken in session

### Restaurants

#### Get Next Restaurant
```
GET /api/sessions/:sessionId/next
Headers: { "X-Member-Token": "token" }
Response: {
  "restaurant": {
    "id": 42,
    "name": "Sarma",
    "cuisine": ["Mediterranean", "Middle Eastern"],
    "neighborhood": "Somerville",
    "address": "249 Pearl St, Somerville, MA",
    "pricing": { "lunch": null, "dinner": 55 },
    "menu": { ... },
    "imageUrl": "https://..."
  },
  "progress": {
    "current": 46,
    "total": 107
  }
}
```
- Returns `null` restaurant when all have been voted on

#### Get All Restaurants (for preloading)
```
GET /api/restaurants
Response: {
  "restaurants": [ ... ]
}
```

### Voting

#### Submit Vote
```
POST /api/sessions/:sessionId/vote
Headers: { "X-Member-Token": "token" }
Body: {
  "restaurantId": 42,
  "vote": true
}
Response: {
  "success": true,
  "nextRestaurant": { ... } | null
}
```

#### Undo Last Vote
```
DELETE /api/sessions/:sessionId/vote/last
Headers: { "X-Member-Token": "token" }
Response: {
  "success": true,
  "restoredRestaurant": { ... }
}
```

### Matches

#### Get Matches
```
GET /api/sessions/:sessionId/matches
Response: {
  "matches": [
    {
      "restaurant": { ... },
      "likedBy": ["Alice", "Bob"]
    }
  ],
  "allMembersComplete": false,
  "membersComplete": ["Alice"],
  "membersPending": ["Bob"]
}
```

## Implementation Options

### Option A: Supabase Direct (Simplest)
Use Supabase client directly from frontend:
- No custom backend needed
- Use RLS for security
- Use Supabase Realtime for live updates

```typescript
// Frontend code
const { data } = await supabase
  .from('restaurants')
  .select('*')
  .not('id', 'in', votedIds)
  .limit(1);
```

### Option B: Next.js API Routes
```
/app
  /api
    /sessions
      /route.ts         # POST: create session
      /[id]
        /route.ts       # GET: session info
        /join/route.ts  # POST: join session
        /next/route.ts  # GET: next restaurant
        /vote/route.ts  # POST: submit vote
        /matches/route.ts # GET: view matches
```

### Option C: Supabase Edge Functions
For complex logic or if you need server-side only operations.

## Authentication Strategy
For MVP, use simple token-based identification:

1. On join, generate a random token
2. Store in localStorage: `tastebud_${sessionId}_token`
3. Send with each request
4. Server validates token matches a member in that session

No passwords, no accounts - just names within a session.

## Error Handling

```typescript
// Standard error response
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session does not exist or has expired"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| SESSION_NOT_FOUND | 404 | Invalid session ID |
| SESSION_EXPIRED | 410 | Session past expiry |
| NAME_TAKEN | 409 | Name already in session |
| INVALID_TOKEN | 401 | Bad or missing member token |
| ALREADY_VOTED | 409 | Duplicate vote attempt |

## Realtime Updates (Optional)
Using Supabase Realtime for live progress:

```typescript
supabase
  .channel('session:uuid')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'votes',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    updateProgress(payload);
  })
  .subscribe();
```

## Rate Limiting
- 100 requests per minute per IP
- 10 session creations per hour per IP
