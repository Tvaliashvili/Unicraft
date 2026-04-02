import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EMAILJS_SERVICE_ID = "service_xvv38pk";
const EMAILJS_TEMPLATE_ID = "template_tcqn5lq";
const EMAILJS_PUBLIC_KEY = "pb_XXv8v1r4bDAPMh";
const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    let message = "";
    const name = record?.customer_name || "უცნობი";

    if (type === "INSERT") {
      message = `ახალი მომხმარებელი შემოვიდა ჩატში: ${name}`;
    } else if (type === "UPDATE") {
      const unread = record?.unread || 0;
      const prevUnread = old_record?.unread || 0;
      if (unread <= prevUnread) {
        return new Response("no notification needed", { status: 200, headers: corsHeaders });
      }
      message = `ახალი შეტყობინება ჩატში: ${name}`;
    } else {
      return new Response("unknown event", { status: 200, headers: corsHeaders });
    }

    const body: Record<string, unknown> = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: { type: "ჩატი", message, name: "UniCraft", email: "" },
    };
    if (EMAILJS_PRIVATE_KEY) body.accessToken = EMAILJS_PRIVATE_KEY;

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, { status: res.status, headers: corsHeaders });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
