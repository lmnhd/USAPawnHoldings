import { NextRequest, NextResponse } from "next/server";

import { TABLES, putItem, scanItems } from "@/lib/dynamodb";
import type { AgentConfigEntry } from "@/lib/agent-config";

/* ──────────────────────────────────────────────────────
   Agent Configuration API
   Stores/retrieves AI agent settings from DynamoDB
   Store_Config table with config_key prefix "agent_"
   ────────────────────────────────────────────────────── */

// All known agent config keys with their defaults
const AGENT_CONFIG_KEYS = {
  // ── Chat Agent ──
  agent_chat_system_prompt: "",            // custom override — empty = use default
  agent_chat_tone: "casual",               // casual | professional | friendly | firm
  agent_chat_rules: "",                    // additional rules to inject
  agent_chat_special_info: "",             // promotions, announcements, temporary info
  agent_chat_max_response_length: "short", // short | medium | long
  agent_chat_escalation_threshold: "500",  // dollar amount to trigger staff escalation
  agent_chat_greeting: "",                 // custom greeting override

  // ── Appraisal Agent ──
  agent_appraisal_system_prompt: "",       // custom override — empty = use default
  agent_appraisal_rules: "",               // additional rules for appraisal
  agent_appraisal_special_info: "",        // seasonal adjustments, market notes
  agent_appraisal_conservatism: "moderate", // conservative | moderate | generous
  agent_appraisal_haircut: "0",              // dollar amount to subtract from appraisal (breathing room)
  agent_appraisal_focus_categories: "",    // comma-separated priority categories

  // ── Voice Agent ──
  agent_voice_system_prompt: "",           // full override — empty = assembled from chat + addendum
  agent_voice_addendum: "",                // phone-specific instructions layered on chat prompt
  agent_voice_rules: "",                   // additional voice-only rules
  agent_voice_voice: "alloy",             // OpenAI voice: alloy | echo | fable | onyx | nova | shimmer
  agent_voice_temperature: "0.8",         // 0.0-1.0 creativity
  agent_voice_greeting: "",               // custom greeting override
} as const;

type AgentConfigKey = keyof typeof AGENT_CONFIG_KEYS;

/**
 * GET /api/agent-config
 * Returns all agent configuration entries
 */
export async function GET() {
  try {
    // Pull all config items with "agent_" prefix
    const allConfig = await scanItems<AgentConfigEntry>(TABLES.storeConfig, {
      FilterExpression: "begins_with(config_key, :prefix)",
      ExpressionAttributeValues: { ":prefix": "agent_" } as Record<string, unknown>,
    } as Parameters<typeof scanItems>[1]);

    // Merge with defaults so all keys are present
    const configMap: Record<string, { value: string; updated_at: string; updated_by?: string }> = {};

    for (const key of Object.keys(AGENT_CONFIG_KEYS) as AgentConfigKey[]) {
      configMap[key] = {
        value: AGENT_CONFIG_KEYS[key],
        updated_at: "",
        updated_by: undefined,
      };
    }

    for (const entry of allConfig) {
      configMap[entry.config_key] = {
        value: entry.value,
        updated_at: entry.updated_at,
        updated_by: entry.updated_by,
      };
    }

    return NextResponse.json({ config: configMap });
  } catch (err) {
    console.error("Failed to fetch agent config:", err);
    return NextResponse.json({ error: "Failed to load agent configuration" }, { status: 500 });
  }
}

/**
 * PUT /api/agent-config
 * Updates one or more agent config entries
 * Body: { updates: { [key: string]: string } }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { updates: Record<string, string> };

    if (!body.updates || typeof body.updates !== "object") {
      return NextResponse.json({ error: "Missing 'updates' object in request body" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: string[] = [];

    for (const [key, value] of Object.entries(body.updates)) {
      // Only allow known agent config keys
      if (!(key in AGENT_CONFIG_KEYS)) {
        continue;
      }

      await putItem(TABLES.storeConfig, {
        config_key: key,
        value: String(value),
        updated_at: now,
        updated_by: "owner",
      });

      saved.push(key);
    }

    return NextResponse.json({ success: true, saved, updated_at: now });
  } catch (err) {
    console.error("Failed to update agent config:", err);
    return NextResponse.json({ error: "Failed to save agent configuration" }, { status: 500 });
  }
}
