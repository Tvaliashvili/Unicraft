import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FOLDER_ID = Deno.env.get("GDRIVE_FOLDER_ID")!;
const CLIENT_ID = Deno.env.get("GDRIVE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GDRIVE_CLIENT_SECRET")!;
const REFRESH_TOKEN = Deno.env.get("GDRIVE_REFRESH_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token error: " + JSON.stringify(data));
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // DELETE: remove file from Drive
  if (req.method === "DELETE") {
    try {
      const { fileId } = await req.json();
      if (!fileId) return new Response(JSON.stringify({ error: "No fileId" }), { status: 400, headers: corsHeaders });
      const token = await getAccessToken();
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
    }
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400, headers: corsHeaders });

    const token = await getAccessToken();

    // Upload file
    const meta = JSON.stringify({ name: file.name, parents: [FOLDER_ID] });
    const body = new FormData();
    body.append("metadata", new Blob([meta], { type: "application/json" }));
    body.append("file", file);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body }
    );
    const uploadJson = await uploadRes.json();
    if (!uploadJson.id) throw new Error("Drive error: " + JSON.stringify(uploadJson));
    const fileId = uploadJson.id;

    // Make public
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return new Response(JSON.stringify({ url, id: fileId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
