import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GROQ_KEY) {
      return new Response(JSON.stringify({ reply: "error", suggest_human: false, _debug: "GROQ_API_KEY not set" }), {
        status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { messages, is_working_hours, customer_name } = await req.json();

    const offHoursNote = is_working_hours
      ? `თუ კლიენტს სჭირდება ცოცხალი ოპერატორი (შეკვეთის პრობლემა, დაბრუნება, სპეციალური ფასდაკლება) — JSON-ში suggest_human: true.`
      : `ახლა არასამუშაო საათებია. თუ კლიენტს ოპერატორი სჭირდება — უთხარი: "სამუშაო საათებია 09:00–20:00. ამ დროს მოგვწერე და ოპერატორი დაგეხმარება." JSON-ში suggest_human: false.`;

    const systemPrompt = `შენ ხარ UniCraft-ის AI ასისტენტი. UniCraft — ქართული ავტოსაქონლის მაღაზია: საბურავები, ზეთები, ფილტრები.

მომხმარებლის სახელია: ${customer_name || "მომხმარებელი"}.

პასუხობ მხოლოდ ქართულად. იყავი მეგობრული, მოკლე, კონკრეტული.

შეგიძლია ეხმარო:
• საბურავის ზომის, სეზონის, ბრენდის შეთავაზებაში
• ძრავის ზეთის ტიპისა და სიბლანტის შერჩევაში
• ფილტრების შესახებ კითხვებში
• ზოგადი საავტომობილო კითხვების გადაჭრაში

${offHoursNote}

ᲛᲜᲘᲨᲕᲜᲔᲚᲝᲕᲐᲜᲘ: პასუხი ᲛᲮᲝᲚᲝᲓ JSON ფორმატში, სხვა ტექსტი არ დაამატო:
{"reply": "შენი პასუხი", "suggest_human": false}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

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
