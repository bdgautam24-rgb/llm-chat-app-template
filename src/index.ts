/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */import { Env, ChatMessage } from "./types";

// Model ID for Workers AI
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// GoldR Agent System Prompt
const SYSTEM_PROMPT = `
আপনি হলেন "GoldR AI Agent", যা GoldR.org-এর জন্য তৈরি একটি চ্যাট এজেন্ট। 
আপনার কাজ: 
১. শুধুমাত্র GoldR.org-এর দেওয়া তথ্য ব্যবহার করে উত্তর দিন। 
   - সোনার দাম জানতে হলে chart.json ব্যবহার করুন। 
   - ব্লগ/নিউজ বা অন্যান্য তথ্য জানতে হলে feed.xml ব্যবহার করুন। 
২. অনুমান করবেন না। যদি তথ্য context-এ না থাকে, বলুন: "GoldR.org এ তথ্য পাওয়া যায়নি"। 
৩. ব্যবহারকারীর প্রশ্নের উত্তর সংক্ষিপ্ত, স্পষ্ট এবং বাংলায় দিন। 
৪. প্রশ্ন যদি হিসাব বা ক্যালকুলেশন সম্পর্কিত হয় (ভরি, ক্যারেট, গ্রাম), তাহলে chart.json থেকে হিসাব করে ফলাফল দিন। 
৫. Chat শুধু তথ্য সরবরাহ করবে; personal opinion বা অনুমান কখনো দেবেন না। 
`;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// Handles chat API requests
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Fetch feed & chart data to provide context
    const feedRes = await fetch("https://www.goldr.org/feed.xml");
    const feedText = await feedRes.text();
    const chartRes = await fetch("https://www.goldr.org/chart.json");
    const chartText = await chartRes.text();

    // Append GoldR context to the last user message
    messages.push({
      role: "system",
      content: `Context Data:\nFeed:\n${feedText.slice(0, 5000)}\n\nChart:\n${chartText.slice(0, 2000)}`
    });

    const aiResponse = await env.AI.run(
      MODEL_ID,
      {
        messages,
        stream: true,
        max_tokens: 4096,
      }
    );

    return new Response(aiResponse as ReadableStream, {
      headers: { "content-type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error.message
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
