/**
 * Seed script: delete all accounts and data, then create the DisruptDNA structure.
 * Requires: SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API).
 * Set it in .env or .env.local, or: export SUPABASE_SERVICE_ROLE_KEY="..."
 * Run: node scripts/seed-accounts.js
 *
 * Structure:
 * - POD 1: Access Bank, Nadissa, Learn Africa (Taiwo - Lead, Ubong)
 * - POD 2: Sparkle, Cardinal Stone, Insight 360 (Ade - Lead, Esther, Courage)
 * - POD 3: Visit Nigeria, Lid Store, Laverita, Nadissa (Bright - Lead, VN Designer, Courage)
 * All passwords: 000000
 * Note: ade@disurptdna.com corrected to ade@disruptdna.com
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash, randomFillSync } from 'crypto';

// Load .env or .env.local into process.env (so npm run seed works without exporting)
function loadEnv() {
  const dir = process.cwd();
  for (const file of ['.env.local', '.env']) {
    const path = resolve(dir, file);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
      break;
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://frpiqitlzansiipkcknl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  console.error('  1. Get it from Supabase Dashboard → Settings → API → service_role (secret).');
  console.error('  2. Add to .env or .env.local:  SUPABASE_SERVICE_ROLE_KEY=your-key');
  console.error('     Or run:  export SUPABASE_SERVICE_ROLE_KEY="your-key"  then  npm run seed');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = '000000';

const USERS = [
  { email: 'justin@disruptdna.com', name: 'Justin', podSlug: null, role: 'admin' },
  { email: 'esther@disruptdna.com', name: 'Esther', podSlug: 'pod-2', role: 'pod_member' },
  { email: 'courage@disruptdna.com', name: 'Courage', podSlug: 'pod-2', role: 'pod_member' },
  { email: 'ade@disruptdna.com', name: 'Ade', podSlug: 'pod-2', role: 'pod_lead' },
  { email: 'taiwo@disruptdna.com', name: 'Taiwo', podSlug: 'pod-1', role: 'pod_lead' },
  { email: 'bright@disruptdna.com', name: 'Bright', podSlug: 'pod-3', role: 'pod_lead' },
  { email: 'ubongking@disruptdna.com', name: 'Ubong', podSlug: 'pod-1', role: 'pod_member' },
  { email: 'VN@disruptdna.com', name: 'VN Designer', podSlug: 'pod-3', role: 'pod_member' },
];

const PODS = [
  { name: 'POD 1', slug: 'pod-1', description: 'Access Bank, Nadissa, Learn Africa' },
  { name: 'POD 2', slug: 'pod-2', description: 'Sparkle, Cardinal Stone, Insight 360' },
  { name: 'POD 3', slug: 'pod-3', description: 'Visit Nigeria, Lid Store, Laverita, Nadissa' },
];

const BRANDS_BY_SLUG = {
  'pod-1': [
    { name: 'Access Bank', slug: 'access-bank' },
    { name: 'Nadissa', slug: 'nadissa' },
    { name: 'Learn Africa', slug: 'learn-africa' },
  ],
  'pod-2': [
    { name: 'Sparkle', slug: 'sparkle' },
    { name: 'Cardinal Stone', slug: 'cardinal-stone' },
    { name: 'Insight 360', slug: 'insight-360' },
  ],
  'pod-3': [
    { name: 'Visit Nigeria', slug: 'visit-nigeria' },
    { name: 'Lid Store', slug: 'lid-store' },
    { name: 'Laverita', slug: 'laverita' },
    { name: 'Nadissa', slug: 'nadissa-pod3' },
  ],
};

function slugFromName(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Match Edge normalizeAccessKey: trim, collapse whitespace
function normalizeAccessKey(input) {
  const s = String(input ?? '').trim();
  const collapsed = s.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : null;
}

// Match app's brandKey: SHA-256 then hex (so client verification works). Normalize before hashing.
function hashAccessKey(key) {
  const normalized = normalizeAccessKey(key) ?? key;
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function generateAccessKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(32);
  randomFillSync(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function run() {
  console.log('1. Cleaning existing data...');

  // Delete in FK order (avoid references to deleted rows)
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brief_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('briefs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('folders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pods').update({ lead_id: null }).not('id', 'is', null);
  const { data: existingProfiles } = await supabase.from('profiles').select('id');
  const authUserIds = (existingProfiles || []).map((p) => p.id);

  for (const uid of authUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) console.warn('  deleteUser', uid, error.message);
  }

  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const allUserIds = (usersList?.users || []).map((u) => u.id);
  for (const uid of allUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) console.warn('  deleteUser', uid, error.message);
  }

  await supabase.from('pods').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('2. Creating pods...');
  const podIdBySlug = {};
  for (const pod of PODS) {
    const { data, error } = await supabase
      .from('pods')
      .insert({ name: pod.name, slug: pod.slug, description: pod.description || null })
      .select('id')
      .single();
    if (error) {
      console.error('  pod insert', pod.slug, error);
      throw error;
    }
    podIdBySlug[pod.slug] = data.id;
  }

  console.log('3. Creating auth users and profiles...');
  const userIdByEmail = {};
  for (const u of USERS) {
    const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name },
    });
    if (createErr) {
      console.error('  createUser', u.email, createErr);
      throw createErr;
    }
    userIdByEmail[u.email] = authUser.user.id;
    const podId = u.podSlug ? podIdBySlug[u.podSlug] : null;
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      email: u.email,
      name: u.name,
      role: u.role,
      pod_id: podId,
    });
    if (profileErr) {
      console.error('  profile insert', u.email, profileErr);
      throw profileErr;
    }
  }

  console.log('4. Setting pod leads...');
  for (const u of USERS) {
    if (u.role !== 'pod_lead') continue;
    const podId = podIdBySlug[u.podSlug];
    const leadId = userIdByEmail[u.email];
    await supabase.from('pods').update({ lead_id: leadId }).eq('id', podId);
  }

  console.log('5. Creating brands (with access keys)...');
  const brandAccessKeys = [];
  for (const [slug, brands] of Object.entries(BRANDS_BY_SLUG)) {
    const podId = podIdBySlug[slug];
    if (!podId) continue;
    for (const b of brands) {
      const brandSlug = b.slug || slugFromName(b.name);
      const accessKey = generateAccessKey();
      const accessKeyHash = hashAccessKey(accessKey);
      const { error } = await supabase
        .from('brands')
        .insert({ name: b.name, slug: brandSlug, pod_id: podId, access_key_hash: accessKeyHash });
      if (error) {
        console.error('  brand insert', b.name, error);
        throw error;
      }
      brandAccessKeys.push({ brand: b.name, slug: brandSlug, accessKey });
    }
  }

  console.log('Done.');
  console.log('\nAccounts (password for all: 000000):');
  USERS.forEach((u) => console.log('  ', u.email, `(${u.name}, ${u.podSlug ?? '—'}, ${u.role})`));
  console.log('\nBrand access keys (give these to clients for /drop/<slug>):');
  brandAccessKeys.forEach(({ brand, slug, accessKey }) => {
    console.log(`  ${brand} (${slug}):  ${accessKey}`);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
