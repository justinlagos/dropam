// Shared brand access validation for client Edge Functions.
// Single key per brand: one access_key_hash. Deterministic verification across environments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function hashAccessKey(key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalize input key: trim, collapse invisible whitespace, reject empty. */
export function normalizeAccessKey(input: string | null | undefined): string | null {
  const s = String(input ?? "").trim();
  const collapsed = s.replace(/\s+/g, " ").trim();
  return collapsed.length > 0 ? collapsed : null;
}

export interface BrandRow {
  id: string;
  slug: string;
  pod_id: string;
  access_key_hash: string;
  is_active: boolean;
  archived_at: string | null;
}

export type ValidateBrandAccessResult =
  | { brand: BrandRow }
  | { error: string; status: 404 | 401 | 500 };

export async function validateBrandAccess(
  brandSlug: string,
  accessKey: string
): Promise<ValidateBrandAccessResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl?.trim() || !serviceRoleKey?.trim()) {
    return { error: "Missing server configuration", status: 500 };
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const slug = String(brandSlug ?? "").trim().toLowerCase();
  if (!slug) return { error: "Brand not found", status: 404 };

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, pod_id, access_key_hash, is_active, archived_at")
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();

  if (brandError || !brand) {
    return { error: "Brand not found", status: 404 };
  }
  if (brand.archived_at) {
    return { error: "Brand is archived", status: 404 };
  }
  if (!brand.is_active) {
    return { error: "Brand is inactive", status: 404 };
  }
  const storedHash = brand.access_key_hash;
  if (!storedHash || typeof storedHash !== "string") {
    return { error: "Brand has no access key configured", status: 404 };
  }

  const key = normalizeAccessKey(accessKey);
  if (!key) return { error: "Invalid access key", status: 401 };

  const hash = await hashAccessKey(key);
  if (hash !== String(storedHash).trim()) {
    return { error: "Invalid access key", status: 401 };
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
