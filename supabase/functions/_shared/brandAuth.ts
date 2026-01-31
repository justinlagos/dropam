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
  if (!slug) {
    console.log(JSON.stringify({ hypothesisId: "H4", branch: "slug_empty", slug: brandSlug }));
    return { error: "Brand not found", status: 404 };
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, pod_id, access_key_hash, is_active, archived_at")
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();

  if (brandError || !brand) {
    console.log(JSON.stringify({ hypothesisId: "H4", branch: "brand_not_found", slug, brandError: brandError?.message }));
    return { error: "Brand not found", status: 404 };
  }
  if (brand.archived_at) {
    console.log(JSON.stringify({ hypothesisId: "H4", branch: "brand_archived", slug }));
    return { error: "Brand is archived", status: 404 };
  }
  if (!brand.is_active) {
    console.log(JSON.stringify({ hypothesisId: "H4", branch: "brand_inactive", slug }));
    return { error: "Brand is inactive", status: 404 };
  }
  const storedHash = brand.access_key_hash;
  if (!storedHash || typeof storedHash !== "string") {
    console.log(JSON.stringify({ hypothesisId: "H4", branch: "no_access_key_configured", slug }));
    return { error: "Brand has no access key configured", status: 404 };
  }

  const key = normalizeAccessKey(accessKey);
  if (!key) {
    console.log(JSON.stringify({ hypothesisId: "H3", branch: "empty_after_normalize", slug, accessKeyLen: String(accessKey ?? "").length }));
    return { error: "Invalid access key", status: 401 };
  }

  const hash = await hashAccessKey(key);
  const storedTrimmed = String(storedHash).trim();
  if (hash !== storedTrimmed) {
    console.log(JSON.stringify({ hypothesisId: "H1", branch: "hash_mismatch", slug, keyLen: key.length, hashPrefix: hash.slice(0, 12), storedPrefix: storedTrimmed.slice(0, 12), hashLen: hash.length, storedLen: storedTrimmed.length }));
    return { error: "Invalid access key", status: 401 };
  }

  console.log(JSON.stringify({ hypothesisId: "H1", branch: "success", slug }));
  return { brand: brand as BrandRow };
}

/** Validate access by share_token. The link with share_token IS the credential—no code needed. */
export async function validateBrandByShareToken(
  shareToken: string
): Promise<ValidateBrandAccessResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl?.trim() || !serviceRoleKey?.trim()) {
    return { error: "Missing server configuration", status: 500 };
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const token = String(shareToken ?? "").trim();
  if (!token) {
    return { error: "Invalid link", status: 401 };
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, slug, pod_id, is_active, archived_at")
    .eq("share_token", token)
    .limit(1)
    .maybeSingle();

  if (brandError || !brand) {
    return { error: "Invalid link", status: 404 };
  }
  if (brand.archived_at) {
    return { error: "This link is no longer valid", status: 404 };
  }
  if (!brand.is_active) {
    return { error: "This link is no longer valid", status: 404 };
  }

  return { brand: { ...brand, access_key_hash: "", is_active: brand.is_active } as BrandRow };
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

export function getShareTokenFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const shareToken =
    url.searchParams.get("shareToken") ??
    url.searchParams.get("token") ??
    req.headers.get("x-dropam-share-token") ??
    null;
  return shareToken?.trim() || null;
}
