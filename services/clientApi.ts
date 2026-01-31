/**
 * Client API for anonymous brand drop: calls Supabase Edge Functions
 * with brand access key. Used on /drop/:brandSlug when client is not logged in.
 */

const DEFAULT_SUPABASE_URL = 'https://frpiqitlzansiipkcknl.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycGlxaXRsemFuc2lpcGtja25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDE3MTIsImV4cCI6MjA4NTI3NzcxMn0.TsgvYYrXWGt9uMBkvzALh_JqQYd3sqGJtv4NPSuokuk';

const getBaseUrl = () => {
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL ?? (process as any).env?.REACT_APP_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
    return `${String(url).replace(/\/$/, '')}/functions/v1`;
  } catch {}
  return `${DEFAULT_SUPABASE_URL}/functions/v1`;
};

const getAnonKey = () => {
  try {
    return (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? (process as any).env?.REACT_APP_SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;
  } catch {}
  return DEFAULT_ANON_KEY;
};

export interface ClientBrief {
  id: string;
  brandId: string;
  podId: string;
  title: string;
  status: string;
  submittedAt: string;
  files: { id: string; name: string; type: string; url: string; visibleToClient?: boolean; uploadedAt: string }[];
  messages: { id: string; text: string; authorName: string; visibility: string; createdAt: string }[];
}

export async function verifyBrandAccess(brandSlug: string, accessKey: string): Promise<{ ok: boolean; error?: string }> {
  const base = getBaseUrl();
  const key = String(accessKey || '').trim();
  if (!key) return { ok: false, error: 'Access key is required' };
  try {
    const res = await fetch(`${base}/client-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandSlug: brandSlug?.trim(), accessKey: key }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as any).error ?? 'Invalid access key' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message?.includes('fetch') ? 'Network error. Check your connection.' : 'Invalid access key' };
  }
}

export async function getClientBriefs(brandSlug: string, accessKey: string): Promise<{ briefs: ClientBrief[]; error?: string }> {
  const base = getBaseUrl();
  const params = new URLSearchParams({ brandSlug: brandSlug?.trim() ?? '', accessKey: String(accessKey || '').trim() });
  const res = await fetch(`${base}/client-briefs?${params}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getAnonKey()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { briefs: [], error: (data as any).error ?? 'Failed to load briefs' };
  return { briefs: (data as any).briefs ?? [] };
}

export async function createClientBrief(
  brandSlug: string,
  accessKey: string,
  file: File,
  title?: string
): Promise<{ brief?: ClientBrief; error?: string }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.set('brandSlug', brandSlug?.trim() ?? '');
  form.set('accessKey', String(accessKey || '').trim());
  form.set('title', title ?? file.name);
  form.set('file', file);
  const res = await fetch(`${base}/client-briefs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAnonKey()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data as any).error ?? 'Failed to create brief' };
  return { brief: data as ClientBrief };
}

export async function sendClientMessage(
  brandSlug: string,
  accessKey: string,
  briefId: string,
  message: string
): Promise<{ id?: string; error?: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/client-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAnonKey()}` },
    body: JSON.stringify({
      brandSlug: brandSlug?.trim(),
      accessKey: String(accessKey || '').trim(),
      briefId,
      message,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data as any).error ?? 'Failed to send message' };
  return { id: (data as any).id };
}

const STORAGE_KEY = 'dropam_brand_key';

export function getStoredAccessKey(brandSlug: string): string | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}_${brandSlug}`);
    return raw;
  } catch {
    return null;
  }
}

export function setStoredAccessKey(brandSlug: string, accessKey: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}_${brandSlug}`, accessKey);
  } catch {}
}

export function clearStoredAccessKey(brandSlug: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_KEY}_${brandSlug}`);
  } catch {}
}
