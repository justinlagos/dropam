import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { getSupabaseProjectRef } from '../services/clientApi';
import { generateAccessKey, hashAccessKey, generateShareToken } from '../services/brandKey';
import { ArrowLeft, BarChart, Users, Building2, Layers, Tag, Plus, Copy, Archive, ChevronRight, UserPlus } from 'lucide-react';
import { Brand, Pod, MembershipRole } from '../types';

interface ProfileWithMemberships {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  memberships: {
    id: string;
    pod_id: string;
    role: MembershipRole;
    status: string;
  }[];
}

const activePods = (pods: Pod[]) => pods.filter((p) => !p.archivedAt);
const activeBrands = (brands: Brand[]) => brands.filter((b) => !b.archivedAt);

const PodsTab: React.FC<{
  pods: Pod[];
  profiles: ProfileWithMemberships[];
  onCreatePod: (name: string, slug: string, description: string, leadId: string) => void;
  onUpdatePod: (podId: string, u: { name?: string; slug?: string; description?: string; lead_id?: string }) => void;
  onArchivePod: (podId: string) => void;
  slugFromName: (n: string) => string;
}> = ({ pods, profiles, onCreatePod, onUpdatePod, onArchivePod, slugFromName }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const submitCreate = () => {
    if (!name.trim()) return;
    onCreatePod(name.trim(), slug.trim() || slugFromName(name), description.trim(), leadId);
    setCreateOpen(false); setName(''); setSlug(''); setDescription(''); setLeadId('');
  };
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
        <Plus size={14} /> Create Pod
      </button>
      {createOpen && (
        <div className="p-4 bg-gray-50 rounded-xl space-y-2">
          <input placeholder="Name (e.g. Tier 1)" value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugFromName(e.target.value)); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Slug (e.g. tier-1)" value={slug} onChange={e => setSlug(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">No lead</option>
            {profiles.filter(p => p.role !== 'admin' || p.memberships.length > 0).map(p => (
              <option key={p.id} value={p.id}>{p.name || p.email}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={submitCreate} className="px-4 py-2 bg-[#111111] text-white rounded-lg text-sm font-medium">Create</button>
            <button type="button" onClick={() => { setCreateOpen(false); setName(''); setSlug(''); setDescription(''); setLeadId(''); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
      {pods.map(pod => (
        <div key={pod.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl ${pod.archivedAt ? 'bg-gray-100 opacity-70' : 'bg-gray-50'}`}>
          {editing === pod.id ? (
            <>
              <input defaultValue={pod.name} id={`pod-name-${pod.id}`} className="w-32 px-2 py-1 border rounded text-sm" />
              <input defaultValue={pod.slug} id={`pod-slug-${pod.id}`} className="w-24 px-2 py-1 border rounded text-sm" />
              <select id={`pod-lead-${pod.id}`} defaultValue={pod.leadId || ''} className="px-2 py-1 border rounded text-sm">
                <option value="">No lead</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.email}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <button type="button" onClick={() => { const n = (document.getElementById(`pod-name-${pod.id}`) as HTMLInputElement)?.value; const s = (document.getElementById(`pod-slug-${pod.id}`) as HTMLInputElement)?.value; const l = (document.getElementById(`pod-lead-${pod.id}`) as HTMLSelectElement)?.value; if (n) onUpdatePod(pod.id, { name: n, slug: s, lead_id: l }); setEditing(null); }} className="px-2 py-1 bg-[#111111] text-white rounded text-xs">Save</button>
                <button type="button" onClick={() => setEditing(null)} className="px-2 py-1 border rounded text-xs">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">{pod.name} {pod.archivedAt && <span className="text-xs text-gray-400">(archived)</span>}</span>
              <span className="text-xs text-gray-500">{pod.slug}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setEditing(pod.id)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded">Edit</button>
                {!pod.archivedAt && <button type="button" onClick={() => onArchivePod(pod.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"><Archive size={12} /> Archive</button>}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const BrandsTab: React.FC<{
  brands: Brand[];
  pods: Pod[];
  onCreateBrand: (name: string, slug: string, podId: string, notificationEmail: string) => void;
  onUpdateBrand: (brandId: string, u: { name?: string; slug?: string; pod_id?: string; notification_email?: string }) => void;
  onArchiveBrand: (brandId: string) => void;
  dropLink: (shareToken: string) => string;
  copyToClipboard: (t: string) => void;
  slugFromName: (n: string) => string;
}> = ({ brands, pods, onCreateBrand, onUpdateBrand, onArchiveBrand, dropLink, copyToClipboard, slugFromName }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [podId, setPodId] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const submitCreate = () => {
    if (!name.trim() || !podId) return;
    onCreateBrand(name.trim(), slug.trim() || slugFromName(name), podId, notificationEmail.trim());
    setCreateOpen(false); setName(''); setSlug(''); setPodId(''); setNotificationEmail('');
  };
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
        <Plus size={14} /> Create Brand
      </button>
      {createOpen && (
        <div className="p-4 bg-gray-50 rounded-xl space-y-2">
          <input placeholder="Name (e.g. Sparkle)" value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugFromName(e.target.value)); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input placeholder="Slug (e.g. sparkle)" value={slug} onChange={e => setSlug(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <select value={podId} onChange={e => setPodId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Select pod</option>
            {pods.map(pod => <option key={pod.id} value={pod.id}>{pod.name}</option>)}
          </select>
          <input placeholder="Brand notification email (optional)" type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={submitCreate} className="px-4 py-2 bg-[#111111] text-white rounded-lg text-sm font-medium">Create</button>
            <button type="button" onClick={() => { setCreateOpen(false); setName(''); setSlug(''); setPodId(''); setNotificationEmail(''); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}
      {brands.map(brand => {
        const pod = pods.find(p => p.id === brand.podId);
        return (
          <div key={brand.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl ${brand.archivedAt ? 'bg-gray-100 opacity-70' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{brand.name} {brand.archivedAt && <span className="text-xs text-gray-400">(archived)</span>}</span>
              <span className="text-xs text-gray-500 shrink-0">{brand.slug}</span>
              {pod && <span className="text-xs text-gray-400 truncate">{pod.name}</span>}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {brand.shareToken && (
                <button type="button" onClick={() => copyToClipboard(dropLink(brand.shareToken!))} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded flex items-center gap-1 text-xs" title="Copy link"><Copy size={12} /> Copy link</button>
              )}
              {!brand.archivedAt && <button type="button" onClick={() => onArchiveBrand(brand.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 text-xs"><Archive size={12} /> Archive</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useUser();
  const { briefs, pods, brands, setPods, setBrands } = useData();
  const [profiles, setProfiles] = useState<ProfileWithMemberships[]>([]);
  const [loading, setLoading] = useState(false);
  const [podsBrandsTab, setPodsBrandsTab] = useState<'pods' | 'brands'>('pods');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData } = await supabase.from('profiles').select('*');

      // Fetch memberships
      const { data: membershipsData } = await supabase.from('memberships').select('*');

      if (profilesData) {
        // Map profiles with their memberships
        const profilesWithMemberships: ProfileWithMemberships[] = profilesData.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role === 'admin' ? 'admin' : 'user',
          memberships: (membershipsData || [])
            .filter((m: any) => m.user_id === p.id)
            .map((m: any) => ({
              id: m.id,
              pod_id: m.pod_id,
              role: m.role,
              status: m.status
            }))
        }));
        setProfiles(profilesWithMemberships);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
    setLoading(false);
  };

  const [roleError, setRoleError] = useState<string | null>(null);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Only allow 'admin' or 'user' roles
    if (newRole !== 'admin' && newRole !== 'user') {
      setRoleError('Invalid role. Use Admin or User.');
      setTimeout(() => setRoleError(null), 3000);
      return;
    }
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchProfiles();
  };

  // Add a membership for a user to a pod
  const handleAddMembership = async (userId: string, podId: string, role: MembershipRole = 'pod_member') => {
    const { error } = await supabase.from('memberships').upsert({
      user_id: userId,
      pod_id: podId,
      role,
      status: 'active'
    }, { onConflict: 'user_id,pod_id' });

    if (error) {
      console.error('Error adding membership:', error);
      setRoleError('Failed to add pod membership.');
      setTimeout(() => setRoleError(null), 3000);
    } else {
      fetchProfiles();
    }
  };

  // Remove a membership
  const handleRemoveMembership = async (membershipId: string) => {
    await supabase.from('memberships').delete().eq('id', membershipId);
    fetchProfiles();
  };

  // Update membership role
  const handleUpdateMembershipRole = async (membershipId: string, newRole: MembershipRole) => {
    await supabase.from('memberships').update({ role: newRole }).eq('id', membershipId);
    fetchProfiles();
  };

  const handleSetPodLead = async (podId: string, leadId: string) => {
    const lead = leadId ? profiles.find(p => p.id === leadId) : null;
    await supabase.from('pods').update({ lead_id: leadId || null, lead_name: lead?.name || null }).eq('id', podId);
    setPods(prev => prev.map(p => p.id === podId ? { ...p, leadId: leadId || undefined, leadName: lead?.name } : p));
  };

  const slugFromName = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreatePod = async (name: string, slug: string, description: string, leadId: string) => {
    const lead = leadId ? profiles.find(p => p.id === leadId) : null;
    const { data, error } = await supabase.from('pods').insert({
      name,
      slug: slug || slugFromName(name),
      description: description || null,
      lead_id: leadId || null,
      lead_name: lead?.name || null,
    }).select().single();
    if (!error && data) setPods(prev => [...prev, { id: data.id, name: data.name, slug: data.slug, description: data.description, leadName: data.lead_name, leadId: data.lead_id }]);
  };

  const handleSavePod = async (podId: string, updates: { name?: string; slug?: string; description?: string; lead_id?: string }) => {
    const lead = updates.lead_id !== undefined ? profiles.find(p => p.id === updates.lead_id) : null;
    await supabase.from('pods').update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.slug !== undefined && { slug: updates.slug }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.lead_id !== undefined && { lead_id: updates.lead_id || null, lead_name: lead?.name || null }),
    }).eq('id', podId);
    setPods(prev => prev.map(p => p.id === podId ? { ...p, ...updates, leadName: lead?.name ?? p.leadName } : p));
  };

  const handleArchivePod = async (podId: string) => {
    if (!confirm('Archive this pod? It will be hidden from normal lists.')) return;
    await supabase.from('pods').update({ archived_at: new Date().toISOString() }).eq('id', podId);
    setPods(prev => prev.map(p => p.id === podId ? { ...p, archivedAt: new Date().toISOString() } : p));
  };

  const handleCreateBrand = async (name: string, slug: string, podId: string, notificationEmail: string) => {
    const shareToken = generateShareToken();
    const rawKey = generateAccessKey();
    const accessKeyHash = await hashAccessKey(rawKey);
    const brandSlug = (slug || slugFromName(name)).toLowerCase().trim();
    const { data, error } = await supabase.from('brands').insert({
      name,
      slug: brandSlug,
      pod_id: podId,
      share_token: shareToken,
      access_key_hash: accessKeyHash,
      is_active: true,
      notification_email: notificationEmail || null,
    }).select().single();
    if (!error && data) {
      setBrands(prev => [...prev, { id: data.id, name: data.name, slug: data.slug, podId: data.pod_id, shareToken: data.share_token }]);
      copyToClipboard(dropLink(data.share_token));
    }
  };

  const handleSaveBrand = async (brandId: string, updates: { name?: string; slug?: string; pod_id?: string; notification_email?: string }) => {
    await supabase.from('brands').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', brandId);
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, ...updates } : b));
  };

  const handleArchiveBrand = async (brandId: string) => {
    if (!confirm('Archive this brand? The drop link will stop working.')) return;
    await supabase.from('brands').update({ archived_at: new Date().toISOString() }).eq('id', brandId);
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, archivedAt: new Date().toISOString() } : b));
  };

  const dropLink = (shareToken: string) => {
    if (typeof window === 'undefined') return `/#/drop/${shareToken}`;
    const origin = window.location.origin;
    const path = window.location.pathname || '/';
    return `${origin}${path}#/drop/${shareToken}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getAvailability = (count: number) => {
    if (count <= 2) return { label: 'Free', cls: 'bg-green-100 text-green-700' };
    if (count <= 5) return { label: 'Busy', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Overloaded', cls: 'bg-red-100 text-red-600' };
  };

  return (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 flex flex-col bg-white font-sans overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-8 pt-24 pb-12">

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-[#111111] mb-2">Settings</h1>
        <p className="text-gray-500 mb-8">{currentUser?.email} ({currentUser?.role})</p>

        <div className="space-y-12">
          {isAdmin && getSupabaseProjectRef() && (
            <section className="bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500">Supabase project: {getSupabaseProjectRef()}</p>
            </section>
          )}

          {isAdmin && (
            <>
              <section className="bg-gray-50 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4 text-[#111111]">
                  <BarChart size={18} />
                  <h2 className="font-bold">Team Workload</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Briefs in progress / review.</p>
                <div className="space-y-3">
                  {profiles.map(p => {
                    const count = briefs.filter((b: any) => b.ownerId === p.id && ['new', 'in_progress', 'review'].includes(b.status)).length;
                    const avail = getAvailability(count);
                    return (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.name || p.email}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${avail.cls}`}>
                          {count} Active · {avail.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-[#111111]">
                  <Building2 size={18} />
                  <h2 className="font-bold">Assign Pod Leads</h2>
                </div>
                <div className="space-y-3 mb-8">
                  {activePods(pods).map(pod => (
                    <div key={pod.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium">{pod.name}</span>
                      <select
                        value={pod.leadId || ''}
                        onChange={(e) => handleSetPodLead(pod.id, e.target.value)}
                        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[180px]"
                      >
                        <option value="">No lead</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name || p.email}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-[#111111]">
                  <Users size={18} />
                  <h2 className="font-bold">Manage People</h2>
                </div>

                {/* Role error toast */}
                {roleError && (
                  <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg">
                    {roleError}
                  </div>
                )}

                <div className="space-y-4">
                  {profiles.map(user => (
                    <div key={user.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Role Selector - Admin or User */}
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                        </div>
                      </div>

                      {/* Memberships - only show for non-admin users */}
                      {user.role !== 'admin' && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Pod Memberships:</p>
                          <div className="flex flex-wrap gap-2">
                            {user.memberships.filter(m => m.status === 'active').map(m => {
                              const pod = pods.find(p => p.id === m.pod_id);
                              return (
                                <div key={m.id} className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg">
                                  <span className="text-xs">{pod?.name || 'Unknown'}</span>
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleUpdateMembershipRole(m.id, e.target.value as MembershipRole)}
                                    className="text-[10px] bg-gray-100 border-0 rounded px-1 py-0.5"
                                  >
                                    <option value="pod_member">Member</option>
                                    <option value="pod_lead">Lead</option>
                                  </select>
                                  <button
                                    onClick={() => handleRemoveMembership(m.id)}
                                    className="text-red-500 hover:text-red-700 text-xs ml-1"
                                    title="Remove from pod"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}

                            {/* Add to pod dropdown */}
                            <div className="relative">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddMembership(user.id, e.target.value, 'pod_member');
                                  }
                                }}
                                className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                              >
                                <option value="">+ Add to pod</option>
                                {activePods(pods)
                                  .filter(pod => !user.memberships.some(m => m.pod_id === pod.id))
                                  .map(pod => (
                                    <option key={pod.id} value={pod.id}>{pod.name}</option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin note */}
                      {user.role === 'admin' && (
                        <p className="text-xs text-gray-400 italic pt-2 border-t border-gray-200">
                          Admins have access to all pods
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-[#111111]">
                  <Layers size={18} />
                  <h2 className="font-bold">Pods and Brands</h2>
                </div>
                <div className="flex border-b border-gray-100 mb-4">
                  <button
                    type="button"
                    onClick={() => setPodsBrandsTab('pods')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${podsBrandsTab === 'pods' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-gray-500 hover:text-[#111111]'}`}
                  >
                    <ChevronRight size={14} /> Pods
                  </button>
                  <button
                    type="button"
                    onClick={() => setPodsBrandsTab('brands')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${podsBrandsTab === 'brands' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-gray-500 hover:text-[#111111]'}`}
                  >
                    <Tag size={14} /> Brands
                  </button>
                </div>

                {podsBrandsTab === 'pods' && (
                  <PodsTab
                    pods={pods}
                    profiles={profiles}
                    onCreatePod={handleCreatePod}
                    onUpdatePod={handleSavePod}
                    onArchivePod={handleArchivePod}
                    slugFromName={slugFromName}
                  />
                )}
                {podsBrandsTab === 'brands' && (
                  <BrandsTab
                    brands={brands}
                    pods={activePods(pods)}
                    onCreateBrand={handleCreateBrand}
                    onUpdateBrand={handleSaveBrand}
                    onArchiveBrand={handleArchiveBrand}
                    dropLink={dropLink}
                    copyToClipboard={copyToClipboard}
                    slugFromName={slugFromName}
                  />
                )}
              </section>
            </>
          )}

          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full h-10 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>

        </div>
        </div>
      </div>
    </div>
  );
};
