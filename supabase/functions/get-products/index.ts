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

  // Single product by ID
  if (id) {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(strip(data)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch ALL active products by paginating in batches of 1000
  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return new Response(JSON.stringify(all.map(strip)), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// Strip discount_price from specs before returning to public
function strip(p: any) {
  if (p?.specs?.discount_price !== undefined) {
    const { discount_price, ...cleanSpecs } = p.specs;
    return { ...p, specs: cleanSpecs };
  }
  return p;
}
