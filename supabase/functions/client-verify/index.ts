// POST: Validate brand access key. Body: { brandSlug, accessKey }
// Returns 200 { ok: true } or 401 { error: "..." }
import { validateBrandAccess } from "../_shared/brandAuth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { brandSlug?: string; accessKey?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const brandSlug = body.brandSlug ?? null;
  const accessKey = body.accessKey ?? body.key ?? null;

  if (!brandSlug || !accessKey) {
    return jsonResponse({ error: "brandSlug and accessKey required" }, 400);
  }

  const result = await validateBrandAccess(brandSlug, accessKey);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 401);
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
