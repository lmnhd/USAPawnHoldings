import { NextRequest, NextResponse } from "next/server";
import { TABLES, scanItems } from "@/lib/dynamodb";

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
