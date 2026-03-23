import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ reply: "error", suggest_human: false, _debug: "ANTHROPIC_API_KEY not set" }), {
        status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { messages, is_working_hours, customer_name } = await req.json();

    const offHoursNote = is_working_hours
      ? `If the customer needs a live operator (order issue, return, special discount) — set suggest_human: true in JSON.`
      : `It is currently outside working hours (09:00-20:00 Tbilisi time). If a live operator is needed, tell the customer EXACTLY this in Georgian: "იმისათვის, რომ შევძლო თქვენი ოპერატორთან დაკავშირება, გთხოვთ მოგვწეროთ სამუშაო საათებში 09:00–20:00." Set suggest_human: false.`;

    const systemPrompt = `You are the AI assistant for UniCraft — a Georgian auto parts store selling tires, oils, and filters.
Customer name: ${customer_name || "მომხმარებელი"}.

CRITICAL LANGUAGE RULES:
- Respond ONLY in Georgian script (ქართული დამწერლობა).
- NEVER mix in Bengali, Hindi, Arabic, Cyrillic or any other script — Georgian ONLY.
- Use short, natural, conversational Georgian. Avoid overly formal or long responses.
- Correct Georgian terms: "სიბლანტე" (not "ვისკოზიტეტი"), "სხვადასხვა" (not "სხვადსხვა"), "შესაფერისი" (not "სჰიგი" or similar).
- Do NOT transliterate English words into Georgian — use proper Georgian equivalents.

You can ONLY help with:
- Tire selection (size, season, brand) — საბურავის შერჩევა
- Engine oil selection (type, viscosity/სიბლანტე)
- Filter questions (oil, air, cabin filters)
- UniCraft store info (working hours 09:00-20:00, delivery available)
- General automotive questions

If asked about anything unrelated to cars, tires, oils, filters, or UniCraft, say EXACTLY:
"ბოდიში, მე მხოლოდ UniCraft-ის პროდუქციასთან — საბურავებთან, ზეთებთან და ფილტრებთან — დაკავშირებულ კითხვებში შემიძლია დახმარება."

${offHoursNote}

IMPORTANT: Respond ONLY with valid JSON, no other text outside the JSON:
{"reply": "your Georgian response here", "suggest_human": false}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const raw = data.content[0].text.trim();

    let parsed;
    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { reply: raw || "ბოდიში, ვერ გავიგე. სცადეთ თავიდან.", suggest_human: false };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ reply: "ბოდიში, შეცდომა მოხდა. გთხოვთ სცადოთ ცოტა მოგვიანებით.", suggest_human: false }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
