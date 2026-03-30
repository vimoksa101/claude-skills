# SPEC-XXX: [Feature Name]

> Copy this template to `docs/specs/SPEC-XXX-feature-name.md`

## Overview

[1-2 paragraphs: What is this feature? Why is it needed? What problem does it solve?]

## User Stories

- As a [role], I want to [action] so that [benefit]
- As a [role], I want to [action] so that [benefit]

## Acceptance Criteria

- [ ] AC-1: [Specific, testable criterion]
- [ ] AC-2: [Specific, testable criterion]
- [ ] AC-3: [Specific, testable criterion]
- [ ] AC-4: [Specific, testable criterion]

> Each AC must be independently verifiable. Use concrete language:
> "User sees X" not "User experience is good"
> "API returns 200 with { field: value }" not "API works correctly"

## Not in Scope

- [Explicitly list what this spec does NOT cover]
- [Prevents scope creep during implementation]

## API Contract

> Define the interface between frontend and backend so they can work in parallel.

### Endpoints

```
POST /api/resource
Request:  { field1: string, field2: number }
Response: { success: true, data: { id: string, ... } }
Error:    { success: false, error: { code: string, message: string } }
```

### Shared Types

```typescript
interface Resource {
  id: string;
  // ...
}
```

## UI Notes

> Describe key screens/components. Reference design system tokens.

### Screen: [Screen Name]
- Layout: [description]
- Key interactions: [tap, swipe, scroll behavior]
- Empty state: [what shows when no data]
- Loading state: [skeleton, spinner]
- Error state: [retry button, message]

## Technical Notes

- [Implementation hints, dependencies, migration needs]
- [Performance considerations]
- [Security considerations]

## File Impact Estimate

- [ ] ≤5 files (safe)
- [ ] 6-12 files (caution)
- [ ] 13+ files (must split this spec)
