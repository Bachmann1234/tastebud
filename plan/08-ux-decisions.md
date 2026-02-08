# UX Decisions

Locked-in decisions for MVP based on discussion.

## Keep It Simple

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Pre-swipe filters | **No** | Just show everything, decide as you go |
| Account creation | **No** | Just a name per session |
| Maybe pile | **No** (for now) | Binary choice keeps it fast |

## Live Matches

Matches are visible as soon as they happen - no need to wait for everyone to finish.

### What You Can See

- Your own progress
- Others' progress percentage
- **Live match count** as people swipe
- Matches page available anytime (shows current matches)

### UI During Swiping
```
┌─────────────────────────────┐
│  Progress                   │
│  You:    ████████████░░ 85% │
│  Sarah:  ██████░░░░░░░░ 45% │
│                             │
│  3 matches so far!          │
│  [Peek at Matches]          │
└─────────────────────────────┘
```

### Matches Page
- Available anytime, even mid-swipe
- Shows restaurants where everyone who has voted said yes
- Updates in real-time as more votes come in

## Future Enhancements (Not MVP)

- **Maybe pile**: Swipe up to save for later, revisit at end
- **Filters**: By cuisine, neighborhood, price before starting
