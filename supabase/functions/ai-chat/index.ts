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
    const { messages, is_working_hours, customer_name } = await req.json();

    const offHoursNote = is_working_hours
      ? `თუ კლიენტს სჭირდება ცოცხალი ოპერატორი (შეკვეთის პრობლემა, დაბრუნება, სპეციალური ფასდაკლება, ტექნიკური ხარვეზი) — JSON-ში suggest_human: true. სხვა შემთხვევაში suggest_human: false.`
      : `ახლა არასამუშაო საათებია. თუ კლიენტს სჭირდება ოპერატორი — პირდაპირ უთხარი: "სამუშაო საათებია 09:00–20:00. ამ დროს მოგვწერე და ოპერატორი დაგეხმარება." JSON-ში suggest_human: false (AI თავადვე ეხმარება ან უხსნის off-hours სიტუაციას).`;

    const systemPrompt = `შენ ხარ UniCraft-ის AI ასისტენტი. UniCraft — ქართული ავტოსაქონლის მაღაზია: საბურავები, ზეთები, ფილტრები.

მომხმარებლის სახელია: ${customer_name || "მომხმარებელი"}.

პასუხობ მხოლოდ ქართულად. იყავი მეგობრული, მოკლე, კონკრეტული.

შეგიძლია ეხმარო:
• საბურავის ზომის, სეზონის, ბრენდის შეთავაზებაში
• ძრავის ზეთის ტიპისა და სიბლანტის (viscosity) შერჩევაში
• ფილტრების (ზეთის, ჰაერის, სალონის) შესახებ კითხვებში
• ზოგადი საავტომობილო კითხვების გადაჭრაში

${offHoursNote}

ᲛᲜᲘᲨᲕᲜᲔᲚᲝᲕᲐᲜᲘ: პასუხი ᲛᲮᲝᲚᲝᲓ JSON ფორმატში, სხვა ტექსტი არ დაამატო:
{"reply": "შენი პასუხი", "suggest_human": false}`;

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
      parsed = { reply: raw, suggest_human: false };
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
