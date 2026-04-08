/**
 * GoldR Jewelry & Gold Price Expert Agent
 * 
 * This agent specializes in providing gold prices and jewelry-related information
 * using real-time data from goldr.org.
 */
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `আপনি হলেন "GoldR জুয়েলারি অ্যাসিস্ট্যান্ট", যা গৌতম কুমার পাল (প্রতিষ্ঠাতা, GoldR) দ্বারা তৈরি একটি উন্নত চ্যাট এজেন্ট। আপনার প্রধান কাজ হল স্বর্ণের দাম, জুয়েলারি শিল্প, এবং বাজুস (BAJUS) এর নীতিমালা সম্পর্কিত সঠিক তথ্য প্রদান করা।

আপনার আলোচনার মূলনীতি:
১. আপনি শুধুমাত্র স্বর্ণের দাম, রুপার দাম, জুয়েলারি ডিজাইন, এবং জুয়েলারি শিল্পের নীতিমালা (যেমন বাজুস বিজ্ঞপ্তি) নিয়ে কথা বলবেন।
২. আপনার কাছে GoldR-এর সাম্প্রতিক খবর (RSS Feed) এবং স্বর্ণের মূল্যের চার্ট (JSON Data) এর তথ্য সরবরাহ করা হবে। আপনি সবসময় এই তথ্যগুলো ব্যবহার করে ব্যবহারকারীকে আপডেট জানাবেন।
৩. আপনি স্বর্ণের বিশুদ্ধতা (২২ ক্যারেট, ২১ ক্যারেট, ১৮ ক্যারেট এবং সনাতন পদ্ধতি) সম্পর্কে বিশেষজ্ঞের মতো পরামর্শ দেবেন।
৪. আপনার বাচনভঙ্গি হবে পেশাদার, নম্র এবং তথ্যবহুল।
৫. যদি ব্যবহারকারী এমন কিছু জিজ্ঞাসা করে যা জুয়েলারি বা স্বর্ণের দামের সাথে সম্পর্কিত নয়, তবে আপনি বিনয়ের সাথে বলবেন যে আপনি শুধুমাত্র জুয়েলারি এবং স্বর্ণের দাম সংক্রান্ত বিষয়ে সাহায্য করতে পারেন।
৬. আপনি নিশ্চিত করবেন যে ব্যবহারকারী যেন GoldR (https://www.goldr.org) থেকে সর্বশেষ আপডেটগুলো পায়।

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
    const [feedRes, chartRes] = await Promise.all([
      fetch("https://www.goldr.org/feed.xml"),
      fetch("https://www.goldr.org/chart.json")
    ]);

    const feedText = await feedRes.text();
    const chartData = await chartRes.json();

    // Extracting latest articles from RSS feed
    const latestArticles = feedText
      .match(/<item>([\s\S]*?)<\/item>/g)
      ?.slice(0, 5)
      .map(item => {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                           item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        return titleMatch ? `- ${titleMatch[1]}: ${linkMatch ? linkMatch[1] : ''}` : null;
      })
      .filter(Boolean)
      .join("\n") || "No recent articles found.";

    // Getting the latest gold price from chart data
    const latestPrice = Array.isArray(chartData) ? chartData[chartData.length - 1] : null;
    
    let priceInfo = "স্বর্ণের দামের তথ্য পাওয়া যায়নি।";
    if (latestPrice) {
      // Calculate per gram price (assuming the data is per bhori/vola, which is standard in BD)
      // 1 Bhori = 11.664 grams
      const perGram22K = (latestPrice.k22 / 11.664).toFixed(2);
      
      priceInfo = `সর্বশেষ স্বর্ণের দাম (তারিখ: ${latestPrice.date}):
- ২২ ক্যারেট: ${latestPrice.k22} টাকা (প্রতি গ্রাম: ${perGram22K} টাকা)
- ২১ ক্যারেট: ${latestPrice.k21} টাকা
- ১৮ ক্যারেট: ${latestPrice.k18} টাকা
- সনাতন (Traditional): ${latestPrice.traditional} টাকা`;
    }

    return `
GoldR Recent Updates & BAJUS Notices:
${latestArticles}

Current Gold Price Context:
${priceInfo}
Update Time: ${new Date().toLocaleString('bn-BD')}
`;
  } catch (error) {
    console.error("Error fetching GoldR data:", error);
    return "GoldR থেকে তথ্য সংগ্রহ করতে সমস্যা হয়েছে। অনুগ্রহ করে ম্যানুয়ালি goldr.org চেক করুন।";
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

    // Fetch dynamic data from GoldR to provide as context
    const goldrContext = await fetchGoldRData();

    // Prepare the context-aware system prompt
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nবর্তমান বাজার তথ্য এবং আপডেট:\n${goldrContext}`;

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
