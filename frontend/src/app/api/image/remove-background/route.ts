import { NextRequest, NextResponse } from "next/server";

const REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30000;

type RemoveBackgroundBody = {
  imageDataUrl?: string;
};

function parseBase64Image(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1]?.toLowerCase();
  const base64 = match[2] ?? "";

  if (!mimeType || !base64) {
    return null;
  }

  const sizeBytes = Buffer.from(base64, "base64").length;

  return {
    mimeType,
    base64,
    sizeBytes,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Background removal is not configured. Missing REMOVE_BG_API_KEY." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RemoveBackgroundBody;
    const imageDataUrl = String(body?.imageDataUrl ?? "").trim();

    if (!imageDataUrl) {
      return NextResponse.json({ error: "imageDataUrl is required" }, { status: 400 });
    }

    const parsed = parseBase64Image(imageDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid imageDataUrl. Expected data URL with base64 image content." },
        { status: 400 }
      );
    }

    if (!parsed.mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid image MIME type" }, { status: 400 });
    }

    if (parsed.sizeBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds max size of 10MB" },
        { status: 413 }
      );
    }

    const formData = new FormData();
    formData.set("image_file_b64", parsed.base64);
    formData.set("size", "auto");
    formData.set("format", "png");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let removeBgResponse: Response;
    try {
      removeBgResponse = await fetch(REMOVE_BG_URL, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!removeBgResponse.ok) {
      const text = await removeBgResponse.text();
      return NextResponse.json(
        {
          error: "Background removal failed",
          details: text.slice(0, 300),
          status: removeBgResponse.status,
        },
        { status: 502 }
      );
    }

    const outputBuffer = Buffer.from(await removeBgResponse.arrayBuffer());
    const outputBase64 = outputBuffer.toString("base64");
    const outputDataUrl = `data:image/png;base64,${outputBase64}`;

    return NextResponse.json({
      imageDataUrl: outputDataUrl,
      provider: "remove.bg",
      inputMimeType: parsed.mimeType,
      outputMimeType: "image/png",
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return NextResponse.json(
      {
        error: isAbortError ? "Background removal timed out" : "Failed to remove background",
        details,
      },
      { status: isAbortError ? 504 : 500 }
    );
  }
}
