import { NextRequest, NextResponse } from "next/server";
import { TABLES, scanItems, deleteItem, putItem } from "@/lib/dynamodb";

type ConversationMessage = {
  role: string;
  content: string;
  timestamp: string;
};

type ConversationRecord = {
  conversation_id: string;
  channel: "web" | "sms" | "voice";
  messages: ConversationMessage[];
  customer_id?: string;
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  try {
    console.log('[API /conversations] Fetching conversations from DynamoDB...');
    const conversations = await scanItems<Record<string, unknown>>(TABLES.conversations);
    console.log('[API /conversations] Raw scan returned:', conversations.length, 'items');

    // Sort by started_at descending (newest first)
    const sorted = conversations.sort((a, b) => {
      const aTime = new Date(String(a.started_at ?? "")).getTime();
      const bTime = new Date(String(b.started_at ?? "")).getTime();
      return bTime - aTime;
    });

    console.log('[API /conversations] Returning', sorted.length, 'conversations');
    if (sorted.length > 0) {
      console.log('[API /conversations] First conversation:', sorted[0].conversation_id, 'messages:', (sorted[0].messages as unknown[])?.length ?? 0);
    }

    return NextResponse.json({
      success: true,
      count: sorted.length,
      conversations: sorted.slice(0, 100), // limit to 100 most recent
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
    const channelRaw = String(body?.channel ?? "").toLowerCase();
    const channel = channelRaw === "voice" || channelRaw === "sms" || channelRaw === "web"
      ? channelRaw
      : null;

    if (!conversationId || !channel) {
      return NextResponse.json(
        { success: false, error: "conversation_id and valid channel are required" },
        { status: 400 }
      );
    }

    const inputMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages: ConversationMessage[] = inputMessages
      .map((msg: any) => ({
        role: String(msg?.role ?? "system"),
        content: String(msg?.content ?? "").trim(),
        timestamp: String(msg?.timestamp ?? new Date().toISOString()),
      }))
      .filter((msg: ConversationMessage) => msg.content.length > 0);

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one non-empty message is required" },
        { status: 400 }
      );
    }

    const record: ConversationRecord = {
      conversation_id: conversationId,
      channel,
      messages,
      customer_id: body?.customer_id ? String(body.customer_id) : undefined,
      started_at: String(body?.started_at ?? new Date().toISOString()),
      ended_at: body?.ended_at ? String(body.ended_at) : undefined,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    };

    console.log(`💾 SAVING to DynamoDB: conversation_id=${conversationId}, messages=${messages.length}`);
    console.log(`${'='.repeat(70)}\n`);

    await putItem(TABLES.conversations, record);

    return NextResponse.json({
      success: true,
      conversation_id: record.conversation_id,
      channel: record.channel,
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
