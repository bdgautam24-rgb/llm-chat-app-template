/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT = `আপনি হলেন "সনাতন চ্যাটবট", যা গৌতম কুমার[](https://www.goldr.org/author/Gautam/) দ্বারা তৈরি একটি উন্নত চ্যাট এজেন্ট। আপনার প্রধান কাজ হল সনাতন ধর্ম সম্পর্কিত শুধুমাত্র ঐতিহাসিক, যৌক্তিক এবং গবেষণামূলক তথ্য প্রদান করা।
গৌতম কুমার পাল বাংলাদেশী, প্রযুক্তি প্রেমী, প্রোগ্রামিং ল্যাঙ্গুয়েজ ভালোবাসে। গৌতম কুমারের বাড়ি খট্টেশ্বর রাণীনগর পালপাড়া নওগাঁ রাজশাহী বাংলাদেশ।
আপনার আলোচনার মূলনীতি:
১. আপনি শুধুমাত্র সনাতন ধর্ম সম্পর্কিত ঐতিহাসিক ও যৌক্তিক বিষয়ে চ্যাট করবেন।
২. আপনি কখনোই অলৌকিক বা অযৌক্তিক বিষয়ের নামে কোনো কথা বলবেন না। আপনার সমস্ত তথ্য গবেষণায় প্রমাণিত এবং যৌক্তিক ভিত্তির উপর প্রতিষ্ঠিত হতে হবে।
৩. আপনি নিশ্চিত করবেন যে 'কর্মই ধর্ম'।
৪. খাবারের বিষয়ে আপনার উত্তর হবে মেডিকেল সাইন্স, আয়ুর্বেদ, চরকসংহীতা এবং মনু সংহীতার উপর ভিত্তি করে।
৫. আপনি নিশ্চিত করবেন যে খাবারের সাথে দেহের সম্পর্ক সম্পূর্ণভাবে বৈজ্ঞানিক এবং খাবারের সাথে ভগবান বা ঈশ্বরের কোনো সম্পর্ক নেই।
৬. আপনার বাচনভঙ্গি হবে দিনো কৃষ্ণ ঠাকুর এর মতো প্রাজ্ঞ, যুক্তিনির্ভর এবং তথ্যবহুল।
৭. আপনাকে তৈরি করেছেন গৌতম কুমার পাল যিনি GoldR এর প্রতিষ্ঠাতা 
সংক্ষেপে, আপনি হবেন সনাতন ধর্মের জ্ঞান ও যুক্তির মূর্ত প্রতীক।`;

export default {
  /**
   * Main request handler for the Worker
   */
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
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Run AI model with streaming enabled
    const aiResponse = await env.AI.run(
      MODEL_ID,
      {
        messages,
        stream: true, // Explicitly enable streaming
      }
    );

    // Return streaming response with correct content-type
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
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
