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

export async function verifyBrandAccess(shareToken: string): Promise<{ ok: boolean; slug?: string; brandId?: string; podId?: string; error?: string }> {
  const token = String(shareToken || '').trim();
  if (!token) return { ok: false, error: 'Invalid link' };

  try {
    // Direct Supabase query - simpler and more reliable than Edge Functions
    const supabaseUrl = getSupabaseUrl();
    const res = await fetch(
      `${supabaseUrl}/rest/v1/brands?share_token=eq.${encodeURIComponent(token)}&is_active=eq.true&archived_at=is.null&select=id,slug,pod_id`,
      {
        headers: {
          'apikey': getAnonKey(),
          'Authorization': `Bearer ${getAnonKey()}`
        }
      }
    );

    if (!res.ok) {
      return { ok: false, error: 'Invalid link' };
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return { ok: false, error: 'Invalid link' };
    }

    const brand = data[0];
    return { ok: true, slug: brand.slug, brandId: brand.id, podId: brand.pod_id };
  } catch (err: any) {
    console.error('Brand verification error:', err);
    return { ok: false, error: 'Network error. Check your connection.' };
  }
}

export async function getClientBriefs(shareToken: string): Promise<{ briefs: ClientBrief[]; error?: string }> {
  const token = String(shareToken || '').trim();
  if (!token) return { briefs: [], error: 'Invalid token' };

  try {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': getAnonKey(),
      'Authorization': `Bearer ${getAnonKey()}`
    };

    // First get brand by share_token
    const brandRes = await fetch(
      `${supabaseUrl}/rest/v1/brands?share_token=eq.${encodeURIComponent(token)}&is_active=eq.true&archived_at=is.null&select=id,slug,pod_id`,
      { headers }
    );
    const brands = await brandRes.json();
    if (!brands || brands.length === 0) {
      return { briefs: [], error: 'Invalid link' };
    }
    const brand = brands[0];

    // Get briefs for this brand
    const briefsRes = await fetch(
      `${supabaseUrl}/rest/v1/briefs?brand_id=eq.${brand.id}&select=id,brand_id,pod_id,title,status,submitted_at,owner_name`,
      { headers }
    );
    const briefsData = await briefsRes.json();
    if (!Array.isArray(briefsData)) {
      return { briefs: [] };
    }

    // Get files and messages for each brief
    const briefs: ClientBrief[] = await Promise.all(
      briefsData.map(async (b: any) => {
        // Get files visible to client
        const filesRes = await fetch(
          `${supabaseUrl}/rest/v1/brief_files?brief_id=eq.${b.id}&visible_to_client=eq.true&select=id,name,type,url,uploaded_at`,
          { headers }
        );
        const files = await filesRes.json().catch(() => []);

        // Get client-visible messages
        const msgsRes = await fetch(
          `${supabaseUrl}/rest/v1/messages?brief_id=eq.${b.id}&visibility=eq.client&select=id,text,author_name,visibility,created_at&order=created_at.asc`,
          { headers }
        );
        const messages = await msgsRes.json().catch(() => []);

        return {
          id: b.id,
          brandId: b.brand_id,
          podId: b.pod_id,
          title: b.title,
          status: b.status,
          submittedAt: b.submitted_at,
          files: (files || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            url: f.url,
            visibleToClient: true,
            uploadedAt: f.uploaded_at
          })),
          messages: (messages || []).map((m: any) => ({
            id: m.id,
            text: m.text,
            authorName: m.author_name,
            visibility: m.visibility,
            createdAt: m.created_at
          }))
        };
      })
    );

    return { briefs };
  } catch (err: any) {
    console.error('Failed to load briefs:', err);
    return { briefs: [], error: 'Failed to load briefs' };
  }
}

export async function createClientBrief(
  shareToken: string,
  file: File,
  title?: string
): Promise<{ brief?: ClientBrief; error?: string }> {
  const token = String(shareToken || '').trim();
  if (!token) return { error: 'Invalid token' };

  try {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': getAnonKey(),
      'Authorization': `Bearer ${getAnonKey()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 1. Verify brand
    const brandRes = await fetch(
      `${supabaseUrl}/rest/v1/brands?share_token=eq.${encodeURIComponent(token)}&is_active=eq.true&archived_at=is.null&select=id,slug,pod_id`,
      { headers: { 'apikey': getAnonKey(), 'Authorization': `Bearer ${getAnonKey()}` } }
    );
    const brands = await brandRes.json();
    if (!brands || brands.length === 0) {
      return { error: 'Invalid link' };
    }
    const brand = brands[0];

    // 2. Create brief record
    const briefTitle = title ?? file.name;
    const briefRes = await fetch(`${supabaseUrl}/rest/v1/briefs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        brand_id: brand.id,
        pod_id: brand.pod_id,
        title: briefTitle,
        status: 'new',
        priority: 'normal',
        submitted_at: new Date().toISOString()
      })
    });

    if (!briefRes.ok) {
      const err = await briefRes.text();
      console.error('Failed to create brief:', err);
      return { error: 'Failed to create brief' };
    }

    const briefData = await briefRes.json();
    const brief = Array.isArray(briefData) ? briefData[0] : briefData;

    // 3. Upload file to storage
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${brief.id}/${Date.now()}.${fileExt}`;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/briefs/${fileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': getAnonKey(),
          'Authorization': `Bearer ${getAnonKey()}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      }
    );

    let fileUrl = '';
    if (uploadRes.ok) {
      fileUrl = `${supabaseUrl}/storage/v1/object/public/briefs/${fileName}`;

      // 4. Create brief_file record
      await fetch(`${supabaseUrl}/rest/v1/brief_files`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brief_id: brief.id,
          name: file.name,
          type: 'brief',
          url: fileUrl,
          visible_to_client: true,
          uploaded_at: new Date().toISOString()
        })
      });
    } else {
      console.warn('File upload failed, brief created without file');
    }

    return {
      brief: {
        id: brief.id,
        brandId: brief.brand_id,
        podId: brief.pod_id,
        title: brief.title,
        status: brief.status,
        submittedAt: brief.submitted_at,
        files: fileUrl ? [{
          id: 'temp',
          name: file.name,
          type: 'brief',
          url: fileUrl,
          visibleToClient: true,
          uploadedAt: new Date().toISOString()
        }] : [],
        messages: []
      }
    };
  } catch (err: any) {
    console.error('Create brief error:', err);
    return { error: 'Failed to create brief' };
  }
}

export async function sendClientMessage(
  shareToken: string,
  briefId: string,
  message: string
): Promise<{ id?: string; error?: string }> {
  const token = String(shareToken || '').trim();
  if (!token || !briefId || !message) {
    return { error: 'Missing required fields' };
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': getAnonKey(),
      'Authorization': `Bearer ${getAnonKey()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // Verify brand first
    const brandRes = await fetch(
      `${supabaseUrl}/rest/v1/brands?share_token=eq.${encodeURIComponent(token)}&is_active=eq.true&archived_at=is.null&select=id`,
      { headers: { 'apikey': getAnonKey(), 'Authorization': `Bearer ${getAnonKey()}` } }
    );
    const brands = await brandRes.json();
    if (!brands || brands.length === 0) {
      return { error: 'Invalid link' };
    }

    // Create message
    const msgRes = await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        brief_id: briefId,
        text: message,
        author_name: 'Client',
        author_type: 'client',
        visibility: 'client',
        created_at: new Date().toISOString()
      })
    });

    if (!msgRes.ok) {
      const err = await msgRes.text();
      console.error('Failed to send message:', err);
      return { error: 'Failed to send message' };
    }

    const msgData = await msgRes.json();
    const msg = Array.isArray(msgData) ? msgData[0] : msgData;

    return { id: msg.id };
  } catch (err: any) {
    console.error('Send message error:', err);
    return { error: 'Failed to send message' };
  }
}
