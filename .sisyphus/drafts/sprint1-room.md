# Draft: Sprint 1 - Room (Multi-user, Multi-AI Conversation)

## Requirements (confirmed)
- Sprint 1 focus: Room = multi-user + multi-AI discussion
- Real-time conversation
- Not forcing structure; preserve full timeline
- Sprint 1 scope choice: Room + Pocket + browser extension
- Target platform: Web App
- Multi-AI behavior model: Hybrid (default tool; when invoked becomes participant temporarily)
- Hybrid primary trigger: “Invite window” (explicit invite -> temporary participant -> auto return)
- Invite window end condition: time-based (expires automatically)
- AI context visibility default (participant mode): whole-room history
- Consent/notice mechanism: room-level policy + always-visible indicators
- Multi-AI provisioning: each user brings their own API key (cost/control per user)
- AI output visibility: selectable per-invite (public-to-room vs private-to-inviter)
- Private AI context visibility default: still whole-room history (reply visibility is separate from context sent)

## Requirements (to clarify)
- What “multi-AI” means in product terms (multiple models? multiple roles? user-configured?)
- What “real-time” means (latency target, sync vs async, presence)
- Room artifacts: messages only vs also files/snippets/links
- Identity model: people accounts, guest links, anonymous?
- Sharing model: private rooms, team rooms, public?

## Key Risks / Decisions
- Privacy boundary: what is stored, what is sent to LLMs, consent model
- Cost control for LLM usage in a shared room
- Conversation integrity: edits, deletions, attribution, audit

## Notes
- Whole-room context to AI is the smoothest UX, but requires explicit consent + clear indicators to avoid “silent exfiltration”.

## Open Questions
- Success criteria for Sprint 1 (what must work end-to-end)
- Target platform for Sprint 1 (web app, desktop, plugin-first, etc.)
- Hybrid model details: how AI enters/exits “participant mode”, rate limits, visibility

## Decisions (so far)
- Room history retention: default永久保存
- Message deletion semantics: tombstone/placeholder remains in timeline
- Room access/identity default: Hybrid (invite link + first-join identity confirmation + visible identity label)

## Proposed Decisions (pending confirmation)
- Auth providers for Sprint 1: Google + Email

## Decisions (so far)
 - Email login method: verification code (OTP)

## Discussion Notes
- User is leaning toward mandatory login because Room context is important and must be retrievable/owned long-term.
- Potential refinement: keep “invite link” as the sharing/join mechanism, but require login to actually join/read/write (link = room locator + invite token, not anonymous access).
- User preference: if workload difference is not huge, support multiple auth providers in Sprint 1 to make friend-testing easier.

## Privacy Model Notes (user stance)
- User believes provider-level allowlists may be unnecessary: a Room is a shared/public discussion space; participants should assume others can hear/consume what they say (analogy: Soul/Clubhouse).

## Updated Direction (user correction)
- Sprint 1 Room should default to a public-chatroom model to create a lively "square" and ecosystem.
- However: late joiners (humans) and late-invited AIs should NOT automatically see the full prior timeline.
- Visibility should be based on explicit disclosure: only what participants choose to reveal should become visible to newcomers.
- Implication: timeline persistence may exist, but access to earlier history is gated by disclosure rules (not just membership).

## Public Room Modes (new)
- Two modes: (1) spectate/listen (ephemeral; leaving cuts off; no history saved for spectator) and (2) join room (member; from join time onward, messages persist and are viewable later).
- Speaking should be controlled via a Clubhouse/Soul-style "on stage" permission model, even if the medium is text.
- Proposed speaking modes configurable by room owner: free mic / invite-to-speak / request-to-speak.
- When promoting someone to speak (or join), inviter/owner can disclose selected prior segments/messages to help them catch up.

## Clarification from user
- "On stage" is a metaphor; this is a text chat.
- Joining is effectively equivalent to being allowed to speak/participate (not a separate listener-member tier).
- Join policy should be configurable per room:
  - Default: request + owner approval
  - Optional: free-join rooms (no approval)

## Join Request Handling (direction)
- User wants a combination of: real-time approve prompt + a queue/list for later handling.

## Decision
- Join requests: attempt real-time prompt AND always record into a queue/list (so nothing is lost).

## Moderation Decision (Sprint 1 minimum)
- Join request actions: approve / reject / block / temporary mute (cooldown) for re-apply

## Deferred Details / Backlog
- Cooldown duration for "mute applicant" (default and configurability) deferred; user prefers focusing on more critical decisions.

## Spectator Mode Decision
- Spectators can only see the real-time message stream.
- Spectators cannot send messages, cannot interact, cannot invite/@ AI, and there is no spectator-only chat layer.

## Disclosure UX Direction (user preference)
- Disclosure/sharing mental model should match Feishu/WeChat: when adding someone, you can select some prior messages to send.
- For older history: share via Pocket/Basket (curated selection) rather than exposing full backscroll.
- Avoid complex "share-to-specific-people-inside-room" because it is hard for humans to understand.
- Prefer simple sharing surfaces: either share to the room (everyone currently in room can see), or share via 1:1 DM.
- No separate "future joiners visibility" toggle is desired.

## Interaction Concept Notes
- AI is modeled as a user's "familiar/retainer" (assistant tied to an owner).
- AI speaks only when: (a) owner triggers it, or (b) someone @'s it and owner explicitly approves.
- Opportunity for playful micro-interactions to convey: request -> approval -> speak (e.g., the AI glances at owner before answering).
- Tone decision: default = light anthropomorphism (subtle, not overly theatrical)

## Decisions (so far)
- Familiar approval flow: combine (1) real-time in-room approval UI when owner online + (3) optional auto-approve rules
- Auto-approve rules (Sprint 1 minimum): per-person whitelist
- Late joiner visibility default: from join time onward + explicitly disclosed segments; no automatic backfill of prior history
- Disclosure default form: create Segment (named/reusable/feedable) and disclose that
- Segment disclosure audience default: selectable (to specific people and/or specific AIs)

## Revised Decision (disclosure semantics)
- Disclose-to-room does NOT auto-backfill for late joiners; late joiners only see from join time onward.

## Decision
- On invite/join: default is real-time stream only; any backfill requires explicit selection/share of segments (WeChat-style)

## Persistence Decision
- Raw timeline after join: account-level cloud persistence (like WeChat, but fully cross-device)

## Exit Semantics Decision
- On leaving a room: user chooses whether to keep or delete their personal history copy

## AI Context Default (revised)
- When inviting/triggering an AI familiar: user must manually select the content scope (no automatic raw timeline send)

## AI Context Selection UX
- Default selection mode: mixed (select raw messages with checkboxes; system can treat as a temporary Segment draft; user may optionally save as a named Segment)

## Scope Boundaries
- INCLUDE: Room MVP
- EXCLUDE: Agent orchestration / auto-execution (per FAQ)
