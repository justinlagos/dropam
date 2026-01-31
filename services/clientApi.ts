/**
 * Client API for anonymous brand drop. The link with share_token IS the credential—no code needed.
 * Used on /drop/:shareToken when client is not logged in.
 */

import { getSupabaseUrl } from './supabaseClient';

const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycGlxaXRsemFuc2lpcGtja25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDE3MTIsImV4cCI6MjA4NTI3NzcxMn0.TsgvYYrXWGt9uMBkvzALh_JqQYd3sqGJtv4NPSuokuk';

export function getSupabaseProjectRef(): string | null {
  try {
    const url = getSupabaseUrl();
    const m = String(url).match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const getBaseUrl = () => `${getSupabaseUrl().replace(/\/$/, '')}/functions/v1`;

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

export async function verifyBrandAccess(shareToken: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const base = getBaseUrl();
  const token = String(shareToken || '').trim();
  if (!token) return { ok: false, error: 'Invalid link' };
  try {
    const res = await fetch(`${base}/client-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken: token }),
    });
    const data = await res.json().catch(() => ({}));
    const errorMsg = (data as any).error;
    if (!res.ok) {
      const msg = errorMsg ?? (res.status === 404 ? 'Server not configured.' : 'Invalid link');
      return { ok: false, error: msg };
    }
    return { ok: true, slug: (data as any).slug };
  } catch (err: any) {
    return { ok: false, error: err?.message?.includes('fetch') ? 'Network error. Check your connection.' : 'Invalid link' };
  }
}

export async function getClientBriefs(shareToken: string): Promise<{ briefs: ClientBrief[]; error?: string }> {
  const base = getBaseUrl();
  const params = new URLSearchParams({ shareToken: String(shareToken || '').trim() });
  const res = await fetch(`${base}/client-briefs?${params}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getAnonKey()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { briefs: [], error: (data as any).error ?? 'Failed to load briefs' };
  return { briefs: (data as any).briefs ?? [] };
}

export async function createClientBrief(
  shareToken: string,
  file: File,
  title?: string
): Promise<{ brief?: ClientBrief; error?: string }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.set('shareToken', String(shareToken || '').trim());
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
  shareToken: string,
  briefId: string,
  message: string
): Promise<{ id?: string; error?: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/client-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAnonKey()}` },
    body: JSON.stringify({
      shareToken: String(shareToken || '').trim(),
      briefId,
      message,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data as any).error ?? 'Failed to send message' };
  return { id: (data as any).id };
}
