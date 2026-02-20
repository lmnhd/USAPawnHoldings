---
description: Guidelines for modifying system instructions—prioritize clarity and directness over complexity.
applyTo: **/*.md, **/*.tsx
---

## Core Principle
Rewrite system prompts to be **clear and concise on the first read**. Eliminate redundancy, contradictions, and unnecessary complexity.

## Guidelines
1. **Remove overlap**: Consolidate related rules into single, focused statements.
2. **Eliminate contradictions**: Review for conflicting directives; keep only the authoritative version.
3. **Be direct**: Use imperative language and active voice.
4. **Avoid meta-instructions**: Don't describe *how* to write instructions within instructions.
5. **Front-load priorities**: Place the most critical rules first.

## Example
**Before (wordy, fuzzy):**
> "When making changes to system prompts ALWAYS ensure that we are not over-engineering the prompts with overlapping, contradictory, or confusing instructions - but rather rewriting and re-organizing existing concise instructions in a way that best directs the LLM the first time!"

**After (direct, actionable):**
> "Rewrite system prompts to eliminate redundancy, contradictions, and unnecessary complexity. Prioritize clarity on the first read."