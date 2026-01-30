/**
 * Client API for anonymous brand drop: calls Supabase Edge Functions
 * with brand access key. Used on /drop/:brandSlug when client is not logged in.
 */

const getBaseUrl = () => {
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL ?? (process as any).env?.REACT_APP_SUPABASE_URL;
    if (url) return `${url.replace(/\/$/, '')}/functions/v1`;
  } catch {}
  return '';
};

const getAnonKey = () => {
  try {
    return (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? (process as any).env?.REACT_APP_SUPABASE_ANON_KEY ?? '';
  } catch {}
  return '';
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
  const res = await fetch(`${base}/client-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandSlug, accessKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data as any).error ?? 'Invalid access key' };
  return { ok: true };
}

export async function getClientBriefs(brandSlug: string, accessKey: string): Promise<{ briefs: ClientBrief[]; error?: string }> {
  const base = getBaseUrl();
  const params = new URLSearchParams({ brandSlug, accessKey });
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
  form.set('brandSlug', brandSlug);
  form.set('accessKey', accessKey);
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
    body: JSON.stringify({ brandSlug, accessKey, briefId, message }),
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
