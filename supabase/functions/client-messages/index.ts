// POST: Add client message to a brief. Body: shareToken, briefId, message
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBrandByShareToken } from "../_shared/brandAuth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { shareToken?: string; briefId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const shareToken = body.shareToken ?? null;
  const briefId = body.briefId ?? null;
  const text = body.message ?? body.text ?? "";

  if (!shareToken || !shareToken.trim()) {
    return jsonResponse({ error: "shareToken required" }, 400);
  }
  if (!briefId || !text.trim()) {
    return jsonResponse({ error: "briefId and message required" }, 400);
  }

  const result = await validateBrandByShareToken(shareToken.trim());
  if ("error" in result) {
    return jsonResponse({ error: result.error }, result.status ?? 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: brief } = await supabase
    .from("briefs")
    .select("id, brand_id")
    .eq("id", briefId)
    .eq("brand_id", result.brand.id)
    .single();

  if (!brief) {
    return jsonResponse({ error: "Brief not found or not for this brand" }, 404);
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      brief_id: briefId,
      author_id: null,
      author_name: "Client",
      author_type: "client",
      text: text.trim(),
      visibility: "client",
    })
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    id: msg.id,
    briefId: msg.brief_id,
    authorName: msg.author_name,
    text: msg.text,
    visibility: msg.visibility,
    createdAt: msg.created_at,
  }, 201);
});

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-dropam-access-key",
  };
}
