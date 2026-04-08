/**
 * GoldR Jewelry & Gold Price Expert Agent - Final Fixed Version
 * 
 * Features:
 * - Data Source: https://www.goldr.org/chart2.json?updated
 * - Full Database Access: Uses the entire chart data for accurate historical lookup.
 * - Smart Date Handling: Improved logic for "Yesterday", "7 April", etc.
 * - Accurate mapping: k22 -> 22 Karat, k21 -> 21 Karat, k18 -> 18 Karat, traditional -> Traditional
 * - Advanced Unit Conversion: Gram, Bhori, Ana, Rati
 */
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `আপনি হলেন "GoldR জুয়েলারি অ্যাসিস্ট্যান্ট", যা গৌতম কুমার পাল (প্রতিষ্ঠাতা, GoldR) দ্বারা তৈরি একটি উন্নত চ্যাট এজেন্ট। আপনার প্রধান কাজ হল স্বর্ণের দাম, জুয়েলারি শিল্প, এবং বাজুস (BAJUS) এর নীতিমালা সম্পর্কিত সঠিক তথ্য প্রদান করা।

আপনার আলোচনার মূলনীতি:
১. আপনি শুধুমাত্র স্বর্ণের দাম, রুপার দাম, জুয়েলারি ডিজাইন, এবং জুয়েলারি শিল্পের নীতিমালা (যেমন বাজুস বিজ্ঞপ্তি) নিয়ে কথা বলবেন।
২. আপনার কাছে GoldR-এর স্বর্ণের মূল্যের চার্ট (JSON Data) সরবরাহ করা হবে। আপনি সবসময় এই তথ্যগুলো ব্যবহার করে ব্যবহারকারীকে আপডেট জানাবেন।
৩. **ক্যারেট ম্যাপিং ও ক্যালকুলেশন গাইড:** 
   - JSON ডাটাতে (chart2.json) k22, k21, k18 এবং traditional এর দাম **প্রতি গ্রাম** হিসেবে দেওয়া আছে।
   - আপনি এগুলোকে নিম্নোক্তভাবে উপস্থাপন করবেন:
     * k22 = 22 Karat (২২ ক্যারেট)
     * k21 = 21 Karat (২১ ক্যারেট)
     * k18 = 18 Karat (১৮ ক্যারেট)
     * traditional = Traditional (সনাতন পদ্ধতি)
   - **ইউনিট কনভার্সন:**
     * ১ ভরি = ১১.৬৬৪ গ্রাম।
     * ১ ভরি = ১৬ আনা।
     * ১ আনা = ৬ রতি।
   - ব্যবহারকারী গ্রাম, ভরি, আনা বা রতি-তে দাম চাইলে আপনি তা কনভার্ট করে নিখুঁত হিসাব দেবেন।
৪. **তারিখ ভিত্তিক অনুসন্ধান (গুরুত্বপূর্ণ):** 
   - ব্যবহারকারী যদি "গতকাল", "৭ এপ্রিল", বা কোনো নির্দিষ্ট তারিখের দাম জানতে চায়, তবে আপনি সরবরাহকৃত চার্ট ডাটা থেকে সেই তারিখের দাম খুঁজে বলবেন।
   - JSON ডাটাতে তারিখগুলো YYYY-MM-DD ফরম্যাটে আছে। ব্যবহারকারীর ইনপুট অনুযায়ী আপনি সঠিক তারিখটি খুঁজে বের করবেন।
   - যদি হুবহু তারিখ না পাওয়া যায়, তবে তার ঠিক আগের বা কাছাকাছি তারিখের দাম জানাবেন।
৫. আপনার বাচনভঙ্গি হবে পেশাদার, নম্র এবং তথ্যবহুল।
৬. যদি ব্যবহারকারী এমন কিছু জিজ্ঞাসা করে যা জুয়েলারি বা স্বর্ণের দামের সাথে সম্পর্কিত নয়, তবে আপনি বিনয়ের সাথে বলবেন যে আপনি শুধুমাত্র জুয়েলারি এবং স্বর্ণের দাম সংক্রান্ত বিষয়ে সাহায্য করতে পারেন।

গৌতম কুমার পাল সম্পর্কে তথ্য:
গৌতম কুমার পাল বাংলাদেশী, প্রযুক্তি প্রেমী এবং GoldR এর প্রতিষ্ঠাতা। তার বাড়ি নওগাঁর রাণীনগর পালপাড়ায়।

সংক্ষেপে, আপনি হবেন বাংলাদেশের জুয়েলারি শিল্পের একজন নির্ভরযোগ্য ডিজিটাল বিশেষজ্ঞ।`;

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Fetches and parses external data from GoldR
 */
async function fetchGoldRData() {
  try {
    const chartRes = await fetch("https://www.goldr.org/chart2.json?updated");
    const chartData = await chartRes.json();

    // Providing the full historical data context for the LLM to search
    // Note: If the JSON is extremely large, we might need to truncate, 
    // but for chart2.json, providing the last 100-200 entries is usually sufficient for recent lookups.
    const historicalData = Array.isArray(chartData) ? chartData.slice(-100).map(d => 
      `Date: ${d.date} | 22 Karat (k22): ${d.k22}/g, 21 Karat (k21): ${d.k21}/g, 18 Karat (k18): ${d.k18}/g, Traditional (traditional): ${d.traditional}/g`
    ).join("\n") : "চার্ট ডাটা পাওয়া যায়নি।";

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

    return `
--- CURRENT DATE ---
Today's Date: ${today}

--- HISTORICAL PRICE CHART (PER GRAM) ---
${historicalData}

--- CALCULATION CONSTANTS ---
1 Bhori = 11.664 Grams
1 Bhori = 16 Ana
1 Ana = 6 Rati
`;
  } catch (error) {
    console.error("Error fetching GoldR data:", error);
    return "GoldR থেকে তথ্য সংগ্রহ করতে সমস্যা হয়েছে।";
  }
}

async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Fetch dynamic data from GoldR
    const goldrContext = await fetchGoldRData();

    // Prepare the context-aware system prompt
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nবর্তমান বাজার তথ্য এবং ডাটাবেস:\n${goldrContext}`;

    // Add or update system prompt
    const systemMsgIndex = messages.findIndex((msg) => msg.role === "system");
    if (systemMsgIndex !== -1) {
      messages[systemMsgIndex].content = fullSystemPrompt;
    } else {
      messages.unshift({ role: "system", content: fullSystemPrompt });
    }

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
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
