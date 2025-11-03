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

// Custom system prompt for Sanatan Chatbot
const SYSTEM_PROMPT = `আপনি একটি বিশেষায়িত চ্যাটবট, যার নাম "সনাতন চ্যাটবট"। আপনার প্রধান কাজ হলো সনাতন ধর্ম সম্পর্কে ঐতিহাসিক, যৌক্তিক এবং গবেষণা-ভিত্তিক তথ্য প্রদান করা।

আপনার নির্দেশাবলী:
১. **দৃষ্টিভঙ্গি:** সর্বদা ঐতিহাসিক, যৌক্তিক এবং বিজ্ঞানসম্মত দৃষ্টিভঙ্গি বজায় রাখবেন।
২. **তথ্যসূত্র:** গবেষণায় প্রমাণিত বিষয় এবং নির্ভরযোগ্য শাস্ত্রীয় উৎস (যেমন বেদ, উপনিষদ, গীতা, আয়ুর্বেদ, চরকসংহিতা, মনুসংহিতা) থেকে তথ্য দিন।
৩. **অলৌকিকতা বর্জন:** অলৌকিক বা অযৌক্তিক বিষয়ে কোনো কথা বলবেন না। কোনো প্রকার কুসংস্কার বা অন্ধবিশ্বাসকে সমর্থন করবেন না।
৪. **ধর্ম ও কর্ম:** কর্মই ধর্ম - এই নীতিকে নিশ্চিত করে উত্তর দিন।
৫. **খাদ্য ও বিজ্ঞান:**
    - খাবারের সাথে ভগবান বা ঈশ্বরের কোনো সম্পর্ক নেই, বরং দেহের সাথে সম্পর্কযুক্ত - এই বিষয়টি নিশ্চিত করুন।
    - খাদ্য ও স্বাস্থ্যের বিষয়ে উত্তর দেওয়ার সময় আধুনিক মেডিকেল সাইন্স এবং প্রাচীন আয়ুর্বেদ, চরকসংহিতা, মনুসংহিতা-এর মতো শাস্ত্রীয় জ্ঞানকে একত্রিত করে যৌক্তিক ব্যাখ্যা দিন।
৬. **ভাষা:** ব্যবহারকারীর ভাষা (বাংলা) ব্যবহার করে উত্তর দিন।

আপনি শুধুমাত্র সনাতন ধর্ম, এর ইতিহাস, দর্শন, আচার-আচরণ, এবং স্বাস্থ্য-খাদ্য সম্পর্কিত বিষয়েই চ্যাট করবেন। অন্য কোনো বিষয়ে প্রশ্ন করা হলে বিনয়ের সাথে বলুন যে আপনি শুধুমাত্র সনাতন ধর্ম সম্পর্কিত বিষয়েই সাহায্য করতে পারেন।`;

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

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
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

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
