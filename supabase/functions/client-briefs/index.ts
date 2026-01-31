// GET: List briefs for brand (client-visible only). Query: shareToken
// POST: Create brief + upload file. Body: shareToken, title?, file (base64 or multipart)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateBrandByShareToken,
  getShareTokenFromRequest,
} from "../_shared/brandAuth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/brief-assets\/(.+)$/) || url.match(/\/object\/public\/brief-assets\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method === "GET") {
    const shareToken = getShareTokenFromRequest(req);
    if (!shareToken) {
      return jsonResponse({ error: "shareToken required" }, 400);
    }
    const result = await validateBrandByShareToken(shareToken);
    if ("error" in result) {
      return jsonResponse({ error: result.error }, result.status ?? 401);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: briefs, error } = await supabase
      .from("briefs")
      .select(
        `
        id,
        brand_id,
        pod_id,
        title,
        status,
        submitted_at,
        brief_files (id, name, type, url, visible_to_client, uploaded_at),
        messages (id, text, author_name, visibility, created_at)
      `
      )
      .eq("brand_id", result.brand.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const clientBriefs = await Promise.all(
      (briefs ?? []).map(async (b: any) => {
        const files = await Promise.all(
          (b.brief_files ?? []).map(async (f: any) => {
            let url = f.url;
            try {
              const path = extractStoragePath(f.url);
              if (path) {
                const { data: signed } = await supabase.storage.from("brief-assets").createSignedUrl(path, 3600);
                if (signed?.signedUrl) url = signed.signedUrl;
              }
            } catch (_) {
              /* keep original url if signed URL fails */
            }
            return {
              id: f.id,
              name: f.name,
              type: f.type,
              url,
              visibleToClient: f.visible_to_client,
              uploadedAt: f.uploaded_at,
            };
          })
        );
        return {
          id: b.id,
          brandId: b.brand_id,
          podId: b.pod_id,
          title: b.title,
          status: b.status,
          submittedAt: b.submitted_at,
          files,
          messages: (b.messages ?? []).filter((m: any) => m.visibility === "client").map((m: any) => ({
            id: m.id,
            text: m.text,
            authorName: m.author_name,
            visibility: m.visibility,
            createdAt: m.created_at,
          })),
        };
      })
    );

    return jsonResponse({ briefs: clientBriefs });
  }

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    let shareToken: string | null = null;
    let title = "Untitled brief";
    let fileBlob: Blob | null = null;
    let fileName = "brief";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      shareToken = form.get("shareToken") as string | null;
      title = (form.get("title") as string) ?? "Untitled brief";
      const file = form.get("file") as File | null;
      if (file) {
        fileBlob = file;
        fileName = file.name;
        if (!title || title === "Untitled brief") title = file.name;
      }
    } else {
      let body: { shareToken?: string; title?: string; fileName?: string; fileData?: string };
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }
      shareToken = body.shareToken ?? null;
      title = body.title ?? body.fileName ?? "Untitled brief";
      fileName = body.fileName ?? title;
      if (body.fileData && fileName) {
        const buf = new Uint8Array(
          atob(body.fileData)
            .split("")
            .map((c: string) => c.charCodeAt(0))
        );
        fileBlob = new Blob([buf]);
      }
    }

    if (!shareToken || !shareToken.trim()) {
      return jsonResponse({ error: "shareToken required" }, 400);
    }

    const result = await validateBrandByShareToken(shareToken.trim());
    if ("error" in result) {
      return jsonResponse({ error: result.error }, result.status ?? 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .insert({
        brand_id: result.brand.id,
        pod_id: result.brand.pod_id,
        title,
        status: "new",
        position_x: Math.random() * 200 + 100,
        position_y: Math.random() * 200 + 100,
      })
      .select()
      .single();

    if (briefError || !brief) {
      return jsonResponse({ error: briefError?.message ?? "Failed to create brief" }, 500);
    }

    let fileUrl: string | null = null;
    if (fileBlob) {
      const path = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("brief-assets")
        .upload(path, fileBlob, { contentType: fileBlob.type || "application/octet-stream", upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("brief-assets").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
    }

    if (fileUrl) {
      await supabase.from("brief_files").insert({
        brief_id: brief.id,
        name: fileName,
        type: "brief",
        url: fileUrl,
        visible_to_client: false,
      });
    }

    const { data: fullBrief } = await supabase
      .from("briefs")
      .select(
        `
        id,
        brand_id,
        pod_id,
        title,
        status,
        submitted_at,
        brief_files (id, name, type, url, visible_to_client, uploaded_at),
        messages (id, text, author_name, visibility, created_at)
      `
      )
      .eq("id", brief.id)
      .single();

    const b = fullBrief as any;
    const payload = b
      ? {
          id: b.id,
          brandId: b.brand_id,
          podId: b.pod_id,
          title: b.title,
          status: b.status,
          submittedAt: b.submitted_at,
          files: (b.brief_files ?? []).map((f: any) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            url: f.url,
            visibleToClient: f.visible_to_client,
            uploadedAt: f.uploaded_at,
          })),
          messages: (b.messages ?? []).map((m: any) => ({
            id: m.id,
            text: m.text,
            authorName: m.author_name,
            visibility: m.visibility,
            createdAt: m.created_at,
          })),
        }
      : brief;

    return jsonResponse(payload, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-dropam-access-key",
  };
}
