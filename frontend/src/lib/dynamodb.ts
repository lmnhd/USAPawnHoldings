import {
  DynamoDBClient,
  QueryCommandInput,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export interface Lead {
  lead_id: string;
  source: string;
  customer_name?: string;
  phone?: string;
  item_description?: string;
  estimated_value?: number;
  status: "new" | "contacted" | "scheduled" | "completed" | "rejected";
  timestamp: string;
  photo_url?: string;
  conversation_id?: string;
}

export interface InventoryItem {
  item_id: string;
  category: string;
  brand: string;
  description: string;
  value_range: string;
  savings_pct: string;
  image_url: string;
  date_added: string;
}

export interface StaffLog {
  log_id: string;
  timestamp: number;
  staff_name: string;
  action: "clock_in" | "clock_out" | "break_start" | "break_end";
  shift_duration?: number;
  compliance_status: "ok" | "warning" | "violation";
  notes?: string;
}

export interface Appraisal {
  appraisal_id: string;
  photo_url: string;
  item_category: string;
  metal_type?: string;
  weight_estimate?: number;
  spot_price?: number;
  estimated_value: number;
  timestamp: string;
  lead_id?: string;
}

export interface Conversation {
  conversation_id: string;
  channel: "web" | "sms" | "voice";
  messages: Array<{ role: string; content: string; timestamp: string }>;
  customer_id?: string;
  started_at: string;
  ended_at?: string;
}

export interface StoreConfig {
  config_key: string;
  value: string;
  updated_at: string;
}

export const TABLES = {
  leads: "USA_Pawn_Leads",
  inventory: "USA_Pawn_Inventory",
  staffLog: "USA_Pawn_Staff_Log",
  appraisals: "USA_Pawn_Appraisals",
  conversations: "USA_Pawn_Conversations",
  storeConfig: "USA_Pawn_Store_Config",
} as const;

export type VaultTableName = (typeof TABLES)[keyof typeof TABLES];

const region = process.env.AWS_REGION ?? "us-east-1";

const client = new DynamoDBClient({ region });
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export async function getItem<T extends Record<string, unknown>>(
  tableName: VaultTableName,
  key: Record<string, unknown>,
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    }),
  );
  return (result.Item as T | undefined) ?? null;
}

export async function putItem<T extends Record<string, unknown>>(
  tableName: VaultTableName,
  item: T,
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

export async function queryItems<T extends Record<string, unknown>>(
  tableName: VaultTableName,
  params: Omit<QueryCommandInput, "TableName">,
): Promise<T[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      ...params,
    }),
  );
  return (result.Items as T[] | undefined) ?? [];
}

export async function scanItems<T extends Record<string, unknown>>(
  tableName: VaultTableName,
  params?: Omit<ScanCommandInput, "TableName">,
): Promise<T[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      ...(params ?? {}),
    }),
  );
  return (result.Items as T[] | undefined) ?? [];
}

export async function updateItem<T extends Record<string, unknown>>(
  tableName: VaultTableName,
  key: Record<string, unknown>,
  updates: Record<string, unknown>,
): Promise<T | null> {
  // Build UpdateExpression dynamically from updates object
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      // Use placeholder names to avoid reserved words
      const namePlaceholder = `#attr${index}`;
      const valuePlaceholder = `:val${index}`;
      
      updateExpressions.push(`${namePlaceholder} = ${valuePlaceholder}`);
      expressionAttributeNames[namePlaceholder] = key;
      expressionAttributeValues[valuePlaceholder] = value;
      index++;
    }
  }

  if (updateExpressions.length === 0) {
    // No updates to apply
    return null;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    }),
  );
  return (result.Attributes as T | undefined) ?? null;
}

export async function deleteItem(
  tableName: VaultTableName,
  key: Record<string, unknown>,
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    }),
  );
}
