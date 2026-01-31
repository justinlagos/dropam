// POST: Validate brand access key. Body: { brandSlug, accessKey }
// Returns 200 { ok: true } or 404/401/500 { error: "..." }
import { validateBrandAccess } from "../_shared/brandAuth.ts";

function projectRefFromUrl(url: string): string | null {
  try {
    const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const ref = supabaseUrl ? projectRefFromUrl(supabaseUrl) : null;
  if (ref) console.log("[client-verify] Supabase project:", ref);

  let body: { brandSlug?: string; accessKey?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const brandSlug = body.brandSlug ?? null;
  const accessKey = body.accessKey ?? body.key ?? null;

  if (!brandSlug || accessKey === null || accessKey === undefined) {
    return jsonResponse({ error: "brandSlug and accessKey required" }, 400);
  }

  const result = await validateBrandAccess(brandSlug, accessKey);
  if ("error" in result) {
    const status = result.status ?? 401;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ ok: true });
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
