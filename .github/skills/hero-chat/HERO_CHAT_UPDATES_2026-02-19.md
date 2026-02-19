# Hero Chat Updates — 2026-02-19 (Current)

This document captures the current Hero Chat and voice-assistant behavior after the latest stabilization pass.

## Scope
Applies to:
- `frontend/src/app/api/chat/route.ts`
- `frontend/src/components/ChatWidget.tsx`
- `frontend/src/hooks/useVoiceChat.ts`
- `frontend/src/app/api/realtime-session/route.ts`
- `frontend/src/app/api/inventory/search/route.ts`
- `frontend/src/lib/inventory-search.ts`
- `frontend/src/lib/tag-governance.ts`

## Fundamental Enhancements (12)

### 1) Counter-Style Inventory Conversation
- Inventory answers are selected-item based instead of generic list dumps.
- Responses use stable positional context (`showing #K`) so follow-up turns remain grounded.

### 2) Follow-Up Intent Navigation
- Conversational intents are interpreted as actions:
  - next/another/other/one more
  - previous/back
  - details/tell me more/elaborate/that one
- Selection index is inferred from user text plus previous assistant output.

### 3) Text/Image Synchronization
- Inventory text and image are now anchored to the same selected match.
- This applies across first hit, next-item rotation, and detail follow-ups.

### 4) Result-Set-Based Voice Rotation
- Voice “next item” cursor keying now uses result-set identity instead of raw query strings.
- This hardens image rotation behavior when user phrasing changes across turns.

### 5) Shared Search Core (Text + Voice)
- Inventory ranking/filtering now flows through one shared utility (`inventory-search`).
- Chat API and inventory-search API consume the same matching, fallback, and image-selection logic.

### 6) Tag/Category Governance Consolidation
- Category aliases and token normalization are centralized in `tag-governance`.
- Reduces false negatives caused by category label variance (e.g., watch vs jewelry overlap).

### 7) Voice/Text Prompt Contract Alignment
- Voice session prompt uses the same core dialogue contract as text and appends channel instructions.
- Prevents rule drift between channels during rapid tuning.

### 8) Hero Headline Readability Upgrade
- Hard truncation was removed in favor of adaptive typography.
- Long assistant messages remain readable in hero space through dynamic size/line-height behavior.

### 9) Voice Startup State UX
- Interim voice UI now uses explicit connecting/ready states (e.g., “Retrieving voice agent…”).
- Avoids misleading subtitle fallback before first transcript arrives.

### 10) Quick Action Routing Refinement
- “Browse Inventory” quick reply now navigates directly to `/inventory`.
- Keeps conversion path immediate and avoids unnecessary extra LLM turns.

### 11) Appointment Lead Persistence from Chat Scheduling
- Scheduling from chat now writes appointment leads to the leads table.
- Dashboard lead feed includes these scheduled appointments consistently.

### 12) Voice Structured-Form Parity Restored
- `request_form` is available in voice sessions again and rendered through the same dynamic form panel.
- Voice no longer has to ask multi-field booking questions one-by-one when a form is appropriate.

## New Debug Markers (Form Flow)

To verify voice booking sequence in logs, use these markers:
- `[Voice Tool][FormFlow] request_form invoked ...`
- `[Voice Tool][FormFlow] schedule_visit invoked ...`
- `[Voice Tool][FormFlow] clearActiveForm called ...`

Expected order in a normal booking flow:
1. `request_form invoked`
2. user submits form
3. `clearActiveForm called`
4. `schedule_visit invoked`

## Current Conversational Contract

For inventory and booking interactions:
1. Show one selected item at a time and keep responses concise.
2. Respect next/previous/detail intents naturally.
3. Keep image and text anchored to the same selected item.
4. Prefer structured forms for collecting 2+ related inputs.
5. Preserve channel parity between text and voice behavior.

## Regression Checks Recommended

- `Do you have any watches?` → selected item response + image.
- `Show me the other one` → second item + image switches accordingly.
- `Tell me more about that one` → stays on current item with expanded detail.
- Voice: `I want to schedule a visit` → form appears before any long sequential Q&A.
- Voice logs show `request_form` marker before `schedule_visit` marker.

## Optional Next Enhancements

- Add richer parsing for “go back two” and “compare the last two”.
- Add lightweight structured memory for item-to-item comparisons.
- Add configurable bridge phrases/tone presets through agent config.
