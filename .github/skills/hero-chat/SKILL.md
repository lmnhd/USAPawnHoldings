# Hero Chat Skill

**Goal**: Build a hero-first conversational UI where the assistant response is the headline, and text + voice share one unified session and prompt system.

## What This Skill Provides
- A production-ready starter kit in `starter-kits/hero-chat/src`
- A skill entrypoint (`run.py`) that outputs a manifest/checklist for agents
- Optional validation mode to check whether a target hero-chat feature folder is complete

## Session + Prompt Rules (Non-Negotiable)
1. Generate `sessionId` once and reuse it across text and voice.
2. Keep one prompt source of truth server-side.
3. Use channel-specific addenda only (no diverging business logic).
4. Never allow empty assistant replies (fallback normalization required).

## Usage
```bash
# Generate implementation manifest JSON
python .github/skills/hero-chat/run.py "hero-chat" manifest

# Validate a target feature directory has required hero-chat components
python .github/skills/hero-chat/run.py "frontend/src/features/hero-chat" validate

# Via central skill runner
python .github/skills/skill_runner.py hero-chat "frontend/src/features/hero-chat" "validate"
```

## Output Format
Returns JSON with:
- `starter_kit`: Presence check for required starter files
- `required_contract`: Chat request/response + session/prompt governance rules
- `integration_steps`: Ordered implementation actions
- `definition_of_done`: Session carryover and hero UX checklist
- `validation` (validate mode only): missing component files in target directory

## References
- `CHAT_HERO_SESSION_CARRYOVER.md`
- `HERO_CHAT_UPDATES_2026-02-19.md`
- `starter-kits/hero-chat/README.md`
