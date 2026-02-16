import { NextResponse } from "next/server";

import { STORE_HOURS } from "@/lib/constants";
import { getStoreStatusInEastern } from "@/lib/store-status";

export async function GET() {
  const status = getStoreStatusInEastern(STORE_HOURS);

  return NextResponse.json({
    ...status,
    generated_at: new Date().toISOString(),
  });
}
