import { TABLES, getItem, scanItems } from "@/lib/dynamodb";

/* ──────────────────────────────────────────────────────
   Agent Configuration Helpers
   Shared between API route and server-side consumers
   ────────────────────────────────────────────────────── */

export interface AgentConfigEntry {
  config_key: string;
  value: string;
  updated_at: string;
  updated_by?: string;
  [key: string]: unknown;
}

/**
 * Fetch a single agent config key from DynamoDB
 */
export async function getAgentConfig(key: string): Promise<string | null> {
  try {
    const item = await getItem<AgentConfigEntry>(TABLES.storeConfig, { config_key: key });
    return item?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch-fetch all agent config for a given prefix (e.g., "agent_chat_" or "agent_appraisal_")
 */
export async function getAgentConfigBatch(prefix: string): Promise<Record<string, string>> {
  try {
    const items = await scanItems<AgentConfigEntry>(TABLES.storeConfig, {
      FilterExpression: "begins_with(config_key, :prefix)",
      ExpressionAttributeValues: { ":prefix": prefix } as Record<string, unknown>,
    } as Parameters<typeof scanItems>[1]);

    const result: Record<string, string> = {};
    for (const item of items) {
      result[item.config_key] = item.value;
    }
    return result;
  } catch {
    return {};
  }
}
