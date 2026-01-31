// Shared brand access validation for client Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function hashAccessKey(key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface BrandRow {
  id: string;
  slug: string;
  pod_id: string;
  access_key_hash: string | null;
  is_active: boolean;
  archived_at: string | null;
}

export async function validateBrandAccess(
  brandSlug: string,
  accessKey: string
): Promise<{ brand: BrandRow } | { error: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Normalize: trim and lowercase slug for case-insensitive lookup
  const slug = String(brandSlug ?? "").trim().toLowerCase();
  if (!slug) return { error: "Brand not found" };

  // Use ilike for case-insensitive slug match (handles Sparkle vs sparkle)
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, pod_id, access_key_hash, is_active, archived_at")
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();

  if (brandError || !brand) {
    return { error: "Brand not found" };
  }
  if (brand.archived_at) {
    return { error: "Brand is archived" };
  }
  if (!brand.is_active) {
    return { error: "Brand is inactive" };
  }
  if (!brand.access_key_hash) {
    return { error: "Brand has no access key configured" };
  }

  // Normalize key: trim and remove any non-printable/control characters
  const key = String(accessKey ?? "").trim().replace(/[\x00-\x1F\x7F]/g, "");
  if (!key) return { error: "Invalid access key" };

  const hash = await hashAccessKey(key);
  const storedHash = String(brand.access_key_hash ?? "").trim();
  if (hash !== storedHash) {
    return { error: "Invalid access key" };
  }

  return { brand: brand as BrandRow };
}

export function getBrandSlugAndAccessKeyFromUrl(req: Request): {
  brandSlug: string | null;
  accessKey: string | null;
} {
  const url = new URL(req.url);
  const brandSlug = url.searchParams.get("brandSlug") ?? null;
  const accessKey =
    url.searchParams.get("accessKey") ??
    url.searchParams.get("key") ??
    req.headers.get("x-dropam-access-key") ?? null;
  return { brandSlug, accessKey };
}
