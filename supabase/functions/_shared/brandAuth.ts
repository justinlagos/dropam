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

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, pod_id, access_key_hash, is_active, archived_at")
    .eq("slug", brandSlug)
    .single();

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

  const hash = await hashAccessKey(accessKey);
  if (hash !== brand.access_key_hash) {
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
