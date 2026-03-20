import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400, headers: corsHeaders });

    const arrayBuffer = await file.arrayBuffer();

    const res = await fetch(
      "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": file.type || "image/png",
          "X-Wait-For-Model": "true",
        },
        body: arrayBuffer,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error("HF error: " + err);
    }

    const blob = await res.blob();
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
