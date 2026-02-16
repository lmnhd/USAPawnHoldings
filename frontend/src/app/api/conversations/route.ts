import { NextRequest, NextResponse } from "next/server";
import { TABLES, scanItems, deleteItem, putItem } from "@/lib/dynamodb";
import {
  buildConversationGroups,
  createUnifiedConversationRecord,
  toUnifiedConversationRecord,
  type InteractionSource,
} from "@/lib/conversation-model";

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get("view") ?? "grouped";
    const caseWindowHoursRaw = Number(req.nextUrl.searchParams.get("case_window_hours") ?? "72");
    const caseWindowHours = Number.isFinite(caseWindowHoursRaw) ? caseWindowHoursRaw : 72;

    console.log('[API /conversations] Fetching conversations from DynamoDB...');
    const rawConversations = await scanItems<Record<string, unknown>>(TABLES.conversations);
    console.log('[API /conversations] Raw scan returned:', rawConversations.length, 'items');

    const normalized = rawConversations
      .map((entry) => toUnifiedConversationRecord(entry))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    // Sort by started_at descending (newest first)
    const sorted = normalized.sort((a, b) => {
      const aTime = new Date(String(a.started_at)).getTime();
      const bTime = new Date(String(b.started_at)).getTime();
      return bTime - aTime;
    });

    const grouped = buildConversationGroups(sorted, { caseWindowHours });

    console.log('[API /conversations] Returning', sorted.length, 'normalized conversations and', grouped.length, 'customer groups');
    if (sorted.length > 0) {
      console.log('[API /conversations] First conversation:', sorted[0].conversation_id, 'messages:', sorted[0].messages.length);
    }

    return NextResponse.json({
      success: true,
      count: sorted.length,
      view,
      case_window_hours: caseWindowHours,
      conversations: sorted.slice(0, 200),
      customers: grouped,
    });
  } catch (error) {
    console.error("[API /conversations] Failed to fetch conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const conversationId = String(body?.conversation_id ?? "").trim();
    const sourceRaw = String(body?.source ?? "").toLowerCase();
    const channelRaw = String(body?.channel ?? "").toLowerCase();
    const source = (["web_chat", "sms", "mms", "voice", "appraise", "unknown"] as const).includes(sourceRaw as InteractionSource)
      ? (sourceRaw as InteractionSource)
      : (sourceRaw === "web"
          ? "web_chat"
          : channelRaw === "voice"
            ? "voice"
            : channelRaw === "sms"
              ? "sms"
              : channelRaw === "appraise"
                ? "appraise"
                : "unknown");

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversation_id is required" },
        { status: 400 }
      );
    }

    const inputMessages = Array.isArray(body?.messages) ? body.messages : [];

    if (inputMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one non-empty message is required" },
        { status: 400 }
      );
    }

    const record = createUnifiedConversationRecord({
      conversation_id: conversationId,
      source,
      channel: body?.channel,
      messages: inputMessages,
      customer_id: body?.customer_id ? String(body.customer_id) : undefined,
      phone: body?.phone ? String(body.phone) : undefined,
      started_at: String(body?.started_at ?? new Date().toISOString()),
      ended_at: body?.ended_at ? String(body.ended_at) : undefined,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      source_metadata:
        body?.source_metadata && typeof body.source_metadata === "object"
          ? (body.source_metadata as Record<string, unknown>)
          : undefined,
      case_key: body?.case_key ? String(body.case_key) : undefined,
    });

    console.log(`💾 SAVING to DynamoDB: conversation_id=${conversationId}, source=${record.source}, messages=${record.message_count}`);
    console.log(`${'='.repeat(70)}\n`);

    await putItem(TABLES.conversations, record);

    return NextResponse.json({
      success: true,
      conversation_id: record.conversation_id,
      channel: record.channel,
      source: record.source,
      customer_key: record.customer_key,
      case_key: record.case_key,
    });
  } catch (error) {
    console.error("Failed to create conversation log:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create conversation log" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const clearAll = params.get('clear_all') === 'true';
    const convId = params.get('conversation_id');

    if (clearAll) {
      const conversations = await scanItems<Record<string, unknown>>(TABLES.conversations);
      let deleted = 0;
      for (const conv of conversations) {
        await deleteItem(TABLES.conversations, { conversation_id: conv.conversation_id });
        deleted++;
      }
      return NextResponse.json({ success: true, deleted, message: `Cleared ${deleted} conversations` });
    }

    if (convId) {
      await deleteItem(TABLES.conversations, { conversation_id: convId });
      return NextResponse.json({ success: true, conversation_id: convId });
    }

    return NextResponse.json({ error: 'Provide conversation_id or clear_all=true' }, { status: 400 });
  } catch (error) {
    console.error("Failed to delete conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete conversations" },
      { status: 500 }
    );
  }
}
