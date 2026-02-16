import { NextRequest, NextResponse } from "next/server";
import { TABLES, scanItems, deleteItem } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const conversations = await scanItems<Record<string, unknown>>(TABLES.conversations);

    // Sort by started_at descending (newest first)
    const sorted = conversations.sort((a, b) => {
      const aTime = new Date(String(a.started_at ?? "")).getTime();
      const bTime = new Date(String(b.started_at ?? "")).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      count: sorted.length,
      conversations: sorted.slice(0, 100), // limit to 100 most recent
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
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
