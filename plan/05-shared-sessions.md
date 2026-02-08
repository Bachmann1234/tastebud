# Phase 5: Shared Sessions & Matching

## Overview
The core social feature - allowing multiple people to swipe independently and discover restaurants they all agree on.

## Session Lifecycle

```
┌──────────────┐
│   CREATED    │  Session exists, no members yet
└──────┬───────┘
       │ First person joins
       ▼
┌──────────────┐
│    ACTIVE    │  Members joining and swiping
└──────┬───────┘
       │ All members complete OR 30 days pass
       ▼
┌──────────────┐
│   COMPLETE   │  Results finalized
└──────┬───────┘
       │ Expiry date reached
       ▼
┌──────────────┐
│   EXPIRED    │  Data deleted
└──────────────┘
```

## Sharing Mechanism

### URL Structure
```
https://tastebud.app/s/a1b2c3d4-e5f6-7890-abcd-ef1234567890
                       └─────────── Session UUID ───────────┘
```

### Share Options
1. **Copy Link** - Simple URL copy
2. **QR Code** - For in-person sharing
3. **Native Share** - Uses Web Share API on mobile

```typescript
const shareSession = async (sessionId: string, sessionName: string) => {
  const url = `${window.location.origin}/s/${sessionId}`;

  if (navigator.share) {
    await navigator.share({
      title: `Join my TasteBud session: ${sessionName}`,
      text: 'Help me pick restaurants for Restaurant Week!',
      url
    });
  } else {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  }
};
```

## Matching Algorithm

### Basic Match (MVP)
Restaurant is a match if ALL members swiped right.

```sql
SELECT r.*
FROM restaurants r
WHERE NOT EXISTS (
  -- No member who hasn't voted YES
  SELECT 1 FROM session_members sm
  WHERE sm.session_id = $1
  AND NOT EXISTS (
    SELECT 1 FROM votes v
    WHERE v.member_id = sm.id
    AND v.restaurant_id = r.id
    AND v.vote = true
  )
);
```

### Partial Matches (Enhancement)
Show restaurants with majority approval.

```sql
SELECT
  r.*,
  COUNT(CASE WHEN v.vote THEN 1 END) as yes_votes,
  COUNT(v.id) as total_votes,
  COUNT(CASE WHEN v.vote THEN 1 END)::float / COUNT(v.id) as approval_rate
FROM restaurants r
JOIN votes v ON v.restaurant_id = r.id
WHERE v.session_id = $1
GROUP BY r.id
HAVING COUNT(CASE WHEN v.vote THEN 1 END)::float / COUNT(v.id) >= 0.5
ORDER BY approval_rate DESC, yes_votes DESC;
```

## Results Display

**Matches are visible in real-time** - no need to wait for everyone to finish.

### During Swiping
```
┌─────────────────────────────────────┐
│  Progress                           │
│  You:    ████████████████████ 100%  │
│  Sarah:  ██████████████░░░░░░  70%  │
│                                     │
│  5 matches so far!                  │
│  [View Matches]                     │
└─────────────────────────────────────┘
```

### Matches Page (available anytime)
```
┌─────────────────────────────────────┐
│  🎉 You've matched on 5 so far!     │
│  (Sarah is still swiping...)        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Sarma                       │    │
│  │ Mediterranean • Somerville  │    │
│  │ Dinner $55                  │    │
│  │ [Reserve] [Details]         │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Oleana                      │    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

A restaurant is a "match" once all members who have reached it voted yes.

## Real-time Progress

### Supabase Realtime Setup
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'votes',
      filter: `session_id=eq.${sessionId}`
    }, handleNewVote)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'session_members',
      filter: `session_id=eq.${sessionId}`
    }, handleNewMember)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [sessionId]);
```

### Progress Indicators
- Show other members' progress percentage as they swipe
- "Sarah just finished!" notification when someone completes
- Live match count updates

## Edge Cases

### Late Joiners
- New members can join anytime before expiry
- Their votes count toward new matches
- Existing matches are recalculated

### Member Leaves Mid-Session
- Don't delete their votes
- Allow them to rejoin with same name
- Restore progress from localStorage token

### Tie-Breaking
When deciding what to show first in matches:
1. Perfect matches first
2. Then by total yes votes
3. Then alphabetically

### Empty States
- "No one has joined yet" - Show share prompt
- "No matches yet" - Keep swiping!
- "All done, no matches" - Suggest creating a new session, maybe be less picky!

## Privacy Considerations

- No authentication = anyone with link can join
- Names are visible to all session members
- Individual votes only visible in aggregate
- Sessions auto-delete after 30 days

### Optional: Session Lock
```typescript
// Creator can lock session to prevent new joins
POST /api/sessions/:id/lock
```

## Notifications (Future)

- Email when all members complete
- Push notification for matches
- Reminder if session about to expire

## Analytics Events (Optional)

```typescript
track('session_created', { sessionId });
track('session_joined', { sessionId, memberCount });
track('swipe', { direction: 'right' | 'left', restaurantId });
track('matches_viewed', { sessionId, matchCount });
track('reservation_clicked', { restaurantId });
```
