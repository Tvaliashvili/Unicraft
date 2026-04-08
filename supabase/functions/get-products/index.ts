import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  let query = supabase.from("products").select("*");

  if (id) {
    query = query.eq("id", id).single();
  } else {
    query = query.eq("active", true).order("created_at", { ascending: false }).limit(5000);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Strip discount_price from specs before returning to public
  const strip = (p: any) => {
    if (p?.specs?.discount_price !== undefined) {
      const { discount_price, ...cleanSpecs } = p.specs;
      return { ...p, specs: cleanSpecs };
    }
    return p;
  };

  const cleaned = Array.isArray(data) ? data.map(strip) : strip(data);

  return new Response(JSON.stringify(cleaned), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
