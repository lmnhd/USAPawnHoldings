"""
Hero Chat Skill
Produces an implementation manifest and validation report for hero-first chat UX
with shared text/voice session governance.
"""

import json
import sys
from pathlib import Path


SKILL_DIR = Path(__file__).parent
STARTER_DIR = SKILL_DIR / "starter-kits" / "hero-chat"

STARTER_FILES = [
    "package.json",
    "README.md",
    "tsconfig.json",
    "src/types.ts",
    "src/apiClient.ts",
    "src/session.ts",
    "src/useHeroChat.ts",
    "src/HeroChatContainer.tsx",
    "src/TypewriterHeadline.tsx",
    "src/HeroInputBar.tsx",
    "src/UserMessageRail.tsx",
    "src/VoiceSurface.tsx",
]

INTEGRATION_CHECKLIST = [
    "Hero loads with seeded assistant opener",
    "First user text turn reaches chat backend",
    "Assistant headline updates every turn",
    "Mic click launches voice mode",
    "Voice mode reuses the same sessionId",
    "Returning from voice preserves hero message state",
    "Prompt source is shared across text and voice",
    "Empty model output is normalized with fallback reply",
]


def inspect_starter_kit() -> dict:
    missing = [item for item in STARTER_FILES if not (STARTER_DIR / item).exists()]
    return {
        "starter_kit_path": str(STARTER_DIR),
        "total_files_expected": len(STARTER_FILES),
        "missing_files": missing,
        "all_files_present": len(missing) == 0,
    }


def validate_target(target_dir: Path) -> dict:
    expected = [
        "types.ts",
        "apiClient.ts",
        "session.ts",
        "useHeroChat.ts",
        "HeroChatContainer.tsx",
        "TypewriterHeadline.tsx",
        "HeroInputBar.tsx",
        "UserMessageRail.tsx",
        "VoiceSurface.tsx",
    ]

    missing = [name for name in expected if not (target_dir / name).exists()]
    return {
        "target_dir": str(target_dir),
        "target_exists": target_dir.exists(),
        "missing_components": missing,
        "is_ready": target_dir.exists() and len(missing) == 0,
    }


def build_manifest(target_name: str = "hero-chat", mode: str = "manifest") -> dict:
    starter = inspect_starter_kit()

    response = {
        "success": starter["all_files_present"],
        "skill": "hero-chat",
        "mode": mode,
        "target": target_name,
        "starter_kit": starter,
        "required_contract": {
            "chat_request": ["message", "sessionId", "channel"],
            "chat_response": ["reply", "sessionId"],
            "session_rule": "Reuse one sessionId across text and voice",
            "prompt_rule": "Use one shared prompt source with channel-specific addenda only",
        },
        "integration_steps": [
            "Copy starter-kits/hero-chat/src files into your frontend feature folder",
            "Wire HeroChatContainer into the landing hero section",
            "Set chatEndpoint to your server route and keep sessionId stable",
            "Implement VoiceSurface against your realtime voice transport",
            "Apply the carryover checklist before shipping",
        ],
        "definition_of_done": INTEGRATION_CHECKLIST,
        "reference_docs": [
            str(SKILL_DIR / "SKILL.md"),
            str(SKILL_DIR / "CHAT_HERO_SESSION_CARRYOVER.md"),
            str(STARTER_DIR / "README.md"),
        ],
    }

    if mode == "validate":
        target_dir = Path(target_name)
        response["validation"] = validate_target(target_dir)
        response["success"] = response["success"] and response["validation"]["is_ready"]

    return response


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Missing required argument",
                    "usage": "python run.py <target_name_or_dir> [manifest|validate]",
                },
                indent=2,
            )
        )
        sys.exit(1)

    target_name_or_dir = sys.argv[1]
    mode = sys.argv[2].strip().lower() if len(sys.argv) > 2 else "manifest"

    if mode not in {"manifest", "validate"}:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": f"Invalid mode: {mode}",
                    "usage": "python run.py <target_name_or_dir> [manifest|validate]",
                },
                indent=2,
            )
        )
        sys.exit(1)

    result = build_manifest(target_name_or_dir, mode)
    print(json.dumps(result, indent=2))
