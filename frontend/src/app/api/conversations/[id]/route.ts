import { NextRequest, NextResponse } from "next/server";
import { TABLES, getItem } from "@/lib/dynamodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await getItem(TABLES.conversations, {
      conversation_id: id,
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}
