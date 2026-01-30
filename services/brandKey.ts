/**
 * Generate and hash brand access keys (must match Edge Function hashing).
 * Raw key is shown once to admin; only hash is stored.
 */

export function generateAccessKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

export async function hashAccessKey(key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
