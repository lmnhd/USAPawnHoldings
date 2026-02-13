import OpenAI from "openai";
import { FUNCTION_TOOLS } from "@/lib/constants";

export const CHAT_MODEL = "gpt-5-mini";
export const VISION_MODEL = "gpt-4o";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function createChatCompletion(
  messages: ChatMessage[],
  functions: typeof FUNCTION_TOOLS = FUNCTION_TOOLS,
  model: string = CHAT_MODEL,
) {
  const tools = functions.map((fn) => ({
    type: "function" as const,
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    },
  }));

  return openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
  });
}

export async function analyzeImage(
  imageUrl: string, 
  prompt: string,
  systemMessage?: string
) {
  return analyzeImages([imageUrl], prompt, systemMessage);
}

export async function analyzeImages(
  imageUrls: string[],
  prompt: string,
  systemMessage?: string
) {
  const messages: ChatMessage[] = [];
  
  // Add system message if provided
  if (systemMessage) {
    messages.push({
      role: "system",
      content: systemMessage,
    });
  }
  
  // Build content array with text prompt + all images
  const content: (
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  )[] = [
    { type: "text", text: prompt },
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    })),
  ];

  messages.push({
    role: "user",
    content,
  });

  return openai.chat.completions.create({
    model: VISION_MODEL,
    messages,
    max_tokens: 1500,
  });
}
