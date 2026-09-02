import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")!;
const HF_TOKEN = Deno.env.get("HF_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro-002",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, is_working_hours, customer_name } = await req.json();

    const offHoursNote = is_working_hours
      ? `თუ კლიენტს სჭირდება ცოცხალი ოპერატორი (შეკვეთის პრობლემა, დაბრუნება, სპეციალური ფასდაკლება) — JSON-ში suggest_human: true.`
      : `ახლა არასამუშაო საათებია (09:00–20:00 თბილისის დრო). თუ კლიენტს ოპერატორი სჭირდება — უთხარი ᲖᲣᲡᲢᲐᲓ ასე: "იმისათვის, რომ შევძლო თქვენი ოპერატორთან დაკავშირება, გთხოვთ მოგვწეროთ სამუშაო საათებში 09:00–20:00." JSON-ში suggest_human: false.`;

    const systemPrompt = `შენ ხარ UniCraft-ის AI ასისტენტი. UniCraft — ქართული ავტოსაქონლის მაღაზია: საბურავები, ზეთები, ფილტრები.
მომხმარებლის სახელია: ${customer_name || "მომხმარებელი"}.

ᲙᲠᲘᲢᲘᲙᲣᲚᲘ ᲔᲜᲝᲑᲠᲘᲕᲘ წESEBI:
- პასუხობ ᲛᲮᲝᲚᲝᲓ ქართული დამწერლობით (ქართული სკრიპტი).
- არ შეერიო ბენგალური, ჰინდი, არაბული, კირილური ან სხვა სკრიპტი — მხოლოდ ქართული.
- წერე მოკლედ, ბუნებრივად, მეგობრულად.
- სწორი ტერმინები: "სიბლანტე" (არა "ვისკოზიტეტი"), "შესაფერისი", "სხვადასხვა".

შეგიძლია ეხმარო ᲛᲮᲝᲚᲝᲓ:
- საბურავის ზომის, სეზონის, ბრენდის შეთავაზებაში
- ძრავის ზეთის ტიპისა და სიბლანტის შერჩევაში
- ფილტრების შესახებ კითხვებში (ზეთის, ჰაერის, სალონის)
- UniCraft-ის ინფორმაციაში (სამუშაო საათები 09:00–20:00, მიტანა ხელმისაწვდომია)
- ზოგადი საავტომობილო კითხვების გადაჭრაში

თუ კითხვა ავტომობილებთან, საბურავებთან, ზეთებთან, ფილტრებთან ან UniCraft-თან არ არის დაკავშირებული, თქვი ᲖᲣᲡᲢᲐᲓ:
"ბოდიში, მე მხოლოდ UniCraft-ის პროდუქციასთან — საბურავებთან, ზეთებთან და ფილტრებთან — დაკავშირებულ კითხვებში შემიძლია დახმარება."

${offHoursNote}

ᲛᲜᲘᲨᲕᲜᲔᲚᲝᲕᲐᲜᲘ: პასუხი ᲛᲮᲝᲚᲝᲓ JSON ფორმატში, სხვა ტექსტი გარეთ არ:
{"reply": "შენი პასუხი ქართულად", "suggest_human": false}`;

    // --- Try Gemini first ---
    if (GEMINI_KEY) {
      const geminiContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const geminiBody = JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      });

      for (const model of GEMINI_MODELS) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          { method: "POST", headers: { "content-type": "application/json" }, body: geminiBody }
        );
        if (!res.ok) { await res.text(); continue; }
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        let parsed;
        try { parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()); }
        catch { parsed = { reply: raw || "ბოდიში, ვერ გავიგე.", suggest_human: false }; }
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "content-type": "application/json" } });
      }
    }

    // --- Fallback: Hugging Face (Mistral-7B) ---
    if (HF_TOKEN) {
      const hfMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
      ];

      const res = await fetch(
        "https://router.huggingface.co/hf-inference/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/Mistral-7B-Instruct-v0.3",
            messages: hfMessages,
            max_tokens: 600,
            temperature: 0.7,
          }),
        }
      );

      if (!res.ok) throw new Error("HF: " + await res.text());

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      let parsed;
      try { parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()); }
      catch { parsed = { reply: raw || "ბოდიში, ვერ გავიგე.", suggest_human: false }; }
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    throw new Error("No API keys available");

  } catch (e) {
    return new Response(
      JSON.stringify({ reply: "ბოდიში, შეცდომა მოხდა. გთხოვთ სცადოთ ცოტა მოგვიანებით.", suggest_human: false, _debug: String(e) }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
