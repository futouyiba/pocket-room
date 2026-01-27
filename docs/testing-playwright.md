# E2E Testing (Playwright)

This repo uses Playwright for end-to-end (E2E) testing of the Sprint 1 web prototype.

## Tooling

- Runner: `@playwright/test`
- Config: `playwright.config.ts`
- Tests: `tests/e2e/*.spec.ts`

## Install

```bash
npm install
npx playwright install
```

## Run

```bash
# Headless
npm run test:e2e

# UI mode
npm run test:e2e:ui

# Open last HTML report
npm run test:e2e:report
```

The config auto-starts the Next.js dev server for `apps/web` on port 3000.

## Test Cases (Sprint 1)

### Public Directory
- `rooms directory loads`
  - `/rooms` renders
  - at least one room card exists

### Spectator Flow
- `spectator can request to join`
  - `/rooms/:id` shows `Request to Join`
  - clicking request shows `Waiting approval...`

### Pocket / Segments
- `member can extract a segment`
  - switch to member (dev control)
  - enable selection mode
  - select multiple messages
  - extract -> named segment appears in Pocket sidebar
- `share segment`
  - clicking Share posts a message to the room timeline

### AI Familiars
- `register familiar`
  - register via prompt
- `explicit invocation`
  - select messages -> Ask AI -> prompt text
  - AI posts `Thinking...` then a mock response
- `approval ceremony`
  - simulate someone else requesting your familiar
  - owner must click `Nod (Allow)` for AI to speak

### Extension Capture
- `extension capture simulation`
  - simulate extension drop
  - Pocket sidebar receives a draft segment

## Notes

- The current Sprint 1 UI is a mocked prototype: tests verify the product flows and state transitions.
- As Supabase is wired in for real, swap dev-role controls for real auth + membership and keep the same E2E test expectations.
