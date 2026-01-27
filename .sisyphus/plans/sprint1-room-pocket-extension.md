# Sprint 1: Public Room + Pocket + Extension

## Context

### Product North Star
Pocket Room turns live discussion into inheritable context via explicit, user-controlled disclosure.

### What Sprint 1 Must Deliver
- A public "square" of Rooms where anyone can spectate (real-time only, no interaction)
- Joining a Room is permissioned by the owner (default: request + approval; option: free-join)
- After joining, the member's timeline is saved to their account (cloud, cross-device) for the period they were a member
- Late joiners do **not** automatically see pre-join history; catch-up happens via explicitly shared Segments
- Pocket/Segments: users can extract message ranges into Segments, name them, and share them (to room or to 1:1 DM)
- Multi-AI as "familiars" (owned assistants): they only speak when triggered, or when @'d and owner approves
- AI context: user must explicitly select what is sent to AI; no automatic raw timeline send
- Browser extension: smooth capture flow (user-selected content -> create Segment draft -> share)

### Key Decisions (locked)
- Room is public-discoverable; has spectator mode (view-only real-time; no saving)
- Join policy default: request + owner approval; room may be configured as free-join
- Join requests: attempt realtime prompt AND always record to queue
- Join moderation actions: approve / reject / block / mute applicant (cooldown duration deferred)
- Deletion: message deletion leaves a tombstone placeholder in timeline
- Persistence: member timeline is account-level cloud persistence
- Leaving: user chooses keep vs delete their personal history copy
- Disclosure/catch-up: WeChat/Feishu mental model (select messages -> send as Segment)
- AI familiar approval: realtime approval + per-person auto-approve whitelist
- Auth providers (Sprint 1): Google + Email OTP

## Scope

### In
- Web app (Room list, Room view, spectator + join flow, chat timeline)
- Auth (Google + Email OTP)
- Data model + APIs for rooms/messages/membership/segments/shares
- Basic Pocket UI: segment list + basket (minimal)
- AI familiar UI and explicit-context invocation
- Browser extension MVP: capture selection + send to web app as draft segment

### Out
- Full agent orchestration / automatic task execution
- Fine-grained per-user visibility inside a room timeline (beyond spectator vs member)
- "Future joiners" automatic backfill of disclosed segments
- Complex role hierarchies (beyond owner approval and moderation actions)

## Recommended Tech Defaults (executor can adjust if repo constraints disagree)
- Web: Next.js (App Router) + TypeScript
- Auth + DB + realtime: Supabase (Google OAuth + Email OTP, Postgres)
- UI: Tailwind + shadcn/ui (fast iteration)
- Browser extension: Manifest V3 + TypeScript + Vite

## Verification Strategy
- Unit tests: optional in Sprint 1 (focus on manual verification + smoke tests)
- Manual verification required for each milestone:
  - Auth flows
  - Spectate/join flows
  - Join request moderation
  - Segment creation and sharing
  - AI invocation with explicit context selection
  - Extension capture -> segment draft appears in web app

## Milestones / TODOs

- [ ] 1. Project scaffold
  - Create `apps/web` and `apps/extension` (or similar)
  - Add basic linting + formatting
  - Add dev scripts (web + extension)
  - Acceptance: web starts locally; extension builds

- [ ] 2. Auth (Google + Email OTP)
  - Supabase project config placeholders
  - Web login UI
  - Session persistence
  - Acceptance: can log in with Google; can log in via email OTP

- [ ] 3. Public Room directory + spectator mode
  - Room list visible to any logged-in user (or optionally public)
  - Spectator view: real-time messages only; no interactions; leaving loses access
  - Acceptance: user can open a room as spectator and see new messages arriving

- [ ] 4. Join flow (request + approval) + join queue
  - Request join UI
  - Owner approve prompt (non-blocking) + queue
  - Owner actions: approve/reject/block/mute
  - Acceptance: join request shows up; owner can approve; approved user becomes member

- [ ] 5. Member timeline persistence + late-join rules
  - Members can see messages from join time onward (and later return to see them)
  - Late joiners do not see pre-join history
  - Message delete -> tombstone
  - Leave room -> choose keep vs delete personal history copy
  - Acceptance: a member rejoins later and can view prior joined-period messages; a new member cannot backscroll before join

- [ ] 6. Segment extraction (Pocket MVP)
  - Select message range -> create Segment (named)
  - Segment list + basic basket
  - Sharing surfaces:
    - Share Segment to room (broadcast as a message containing segment link/preview)
    - Share Segment via 1:1 DM
  - Acceptance: create a segment from chat; share to room; share via DM

- [ ] 7. AI familiars + explicit context selection
  - Register an AI familiar per user (provider + model + key stored securely)
  - Trigger flow: select messages/segment -> send to AI -> receive response
  - @-flow: someone @'s a familiar -> owner approval required unless whitelist auto-approve
  - Output visibility: choose per invoke (public to room vs private DM)
  - Acceptance: AI cannot be invoked without explicit context selection; @ requires approval

- [ ] 8. Browser extension capture MVP
  - Select text on a page -> "Send to Pocket Room" action
  - Creates a draft Segment (source URL + selection) visible in web app basket
  - Acceptance: capture from any webpage; appears in basket; can be shared into a room

## Open Questions (to resolve during execution if needed)
- Cooldown duration default for mute applicant
- Whether room directory is public without login or only visible to logged-in users
- Data retention policies beyond Sprint 1
