/**
 * Generate and hash brand access keys (must match Edge Function hashing).
 * Raw key is shown once to admin; only hash is stored.
 * Normalize before hashing so storage matches Edge verification (trim, collapse whitespace).
 */

/** Same as Edge normalizeAccessKey: trim, collapse whitespace, reject empty. */
export function normalizeAccessKey(input: string | null | undefined): string | null {
  const s = String(input ?? '').trim();
  const collapsed = s.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : null;
}

export function generateAccessKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

/** Generate a share token for brand links (URL-safe hex, 36 chars). */
export function generateShareToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashAccessKey(key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
