import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { generateAccessKey, hashAccessKey } from '../services/brandKey';
import { ArrowLeft, BarChart, Users, Building2, Layers, Tag, Plus, Copy, RefreshCw, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { Brand, Pod } from '../types';

const activePods = (pods: Pod[]) => pods.filter((p) => !p.archivedAt);
const activeBrands = (brands: Brand[]) => brands.filter((b) => !b.archivedAt);

const PodsTab: React.FC<{
  pods: Pod[];
  profiles: any[];
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
            {profiles.filter((p: any) => ['pod_member', 'pod_lead', 'admin'].includes(p.role)).map((p: any) => (
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
                {profiles.filter((p: any) => ['pod_member', 'pod_lead', 'admin'].includes(p.role)).map((p: any) => (
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
  newKeyReveal: { brandId: string; slug: string; key: string } | null;
  onCloseKeyReveal: () => void;
  onCreateBrand: (name: string, slug: string, podId: string, notificationEmail: string) => void;
  onUpdateBrand: (brandId: string, u: { name?: string; slug?: string; pod_id?: string; notification_email?: string }) => void;
  onRotateKey: (brandId: string, slug: string) => void;
  onArchiveBrand: (brandId: string) => void;
  dropLink: (slug: string, key?: string) => string;
  copyToClipboard: (t: string) => void;
  slugFromName: (n: string) => string;
}> = ({ brands, pods, onCreateBrand, onUpdateBrand, onRotateKey, onArchiveBrand, dropLink, copyToClipboard, slugFromName }) => {
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
              <button type="button" onClick={() => copyToClipboard(dropLink(brand.slug))} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded flex items-center gap-1 text-xs" title="Copy drop link"><Copy size={12} /> Link</button>
              <button type="button" onClick={() => onRotateKey(brand.id, brand.slug)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded flex items-center gap-1 text-xs" title="Rotate access key"><RefreshCw size={12} /> Rotate</button>
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [podsBrandsTab, setPodsBrandsTab] = useState<'pods' | 'brands'>('pods');
  const [newKeyReveal, setNewKeyReveal] = useState<{ brandId: string; slug: string; key: string } | null>(null);
  
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
      if (isAdmin) {
          fetchProfiles();
      }
  }, [isAdmin]);

  const fetchProfiles = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*');
      if (data) setProfiles(data);
      setLoading(false);
  };

  const [roleError, setRoleError] = useState<string | null>(null);

  const handleUpdateRole = async (userId: string, newRole: string) => {
      // Block client role - clients are brands, not internal users
      if (newRole === 'client') {
        setRoleError('Clients access via brand drop links, not internal accounts.');
        setTimeout(() => setRoleError(null), 3000);
        return;
      }
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      fetchProfiles();
  };
  
  const handleUpdatePod = async (userId: string, podId: string) => {
      await supabase.from('profiles').update({ pod_id: podId }).eq('id', userId);
      fetchProfiles();
  };

  const handleUpdateBrand = async (userId: string, brandId: string) => {
      await supabase.from('profiles').update({ brand_id: brandId }).eq('id', userId);
      fetchProfiles();
  };

  const handleSetPodLead = async (podId: string, leadId: string) => {
      const lead = leadId ? profiles.find((p: any) => p.id === leadId) : null;
      await supabase.from('pods').update({ lead_id: leadId || null, lead_name: lead?.name || null }).eq('id', podId);
      setPods(prev => prev.map(p => p.id === podId ? { ...p, leadId: leadId || undefined, leadName: lead?.name } : p));
  };

  const slugFromName = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreatePod = async (name: string, slug: string, description: string, leadId: string) => {
      const lead = leadId ? profiles.find((p: any) => p.id === leadId) : null;
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
      const lead = updates.lead_id !== undefined ? profiles.find((p: any) => p.id === updates.lead_id) : null;
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
      const rawKey = generateAccessKey();
      const accessKeyHash = await hashAccessKey(rawKey);
      const { data, error } = await supabase.from('brands').insert({
          name,
          slug: slug || slugFromName(name),
          pod_id: podId,
          access_key_hash: accessKeyHash,
          is_active: true,
          notification_email: notificationEmail || null,
      }).select().single();
      if (!error && data) {
          setBrands(prev => [...prev, { id: data.id, name: data.name, slug: data.slug, podId: data.pod_id }]);
          setNewKeyReveal({ brandId: data.id, slug: data.slug, key: rawKey });
      }
  };

  const handleSaveBrand = async (brandId: string, updates: { name?: string; slug?: string; pod_id?: string; notification_email?: string }) => {
      await supabase.from('brands').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', brandId);
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, ...updates } : b));
  };

  const handleRotateBrandKey = async (brandId: string, slug: string) => {
      if (!confirm('Generate a new access key? The old key will stop working immediately.')) return;
      const rawKey = generateAccessKey();
      const accessKeyHash = await hashAccessKey(rawKey);
      await supabase.from('brands').update({ access_key_hash: accessKeyHash, updated_at: new Date().toISOString() }).eq('id', brandId);
      setNewKeyReveal({ brandId, slug, key: rawKey });
  };

  const handleArchiveBrand = async (brandId: string) => {
      if (!confirm('Archive this brand? The drop link will stop working.')) return;
      await supabase.from('brands').update({ archived_at: new Date().toISOString() }).eq('id', brandId);
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, archivedAt: new Date().toISOString() } : b));
  };

  const dropLink = (slug: string, key?: string) => {
      const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || ''}#/drop/${slug}` : `/#/drop/${slug}`;
      return key ? `${base}?key=${key}` : base;
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
    <div className="min-h-screen bg-white flex flex-col items-center pt-24 pb-12 font-sans">
      <div className="w-full max-w-2xl px-8">
        
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-[#111111] mb-2">Settings</h1>
        <p className="text-gray-500 mb-8">{currentUser?.email} ({currentUser?.role})</p>

        <div className="space-y-12">
          
          {isAdmin && (
              <>
                <section className="bg-gray-50 p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-[#111111]">
                        <BarChart size={18} />
                        <h2 className="font-bold">Team Workload</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Briefs in progress / review.</p>
                    <div className="space-y-3">
                        {profiles.filter((p: any) => p.role !== 'client').map((p: any) => {
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
                                    {profiles.filter((p: any) => ['pod_member', 'pod_lead', 'admin'].includes(p.role)).map((p: any) => (
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
                        {/* Filter out any legacy client profiles - they shouldn't exist */}
                        {profiles.filter(u => u.role !== 'client').map(user => (
                            <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                                    <p className="text-xs text-gray-400">{user.email}</p>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {/* Role Selector - Internal roles only (no client) */}
                                    <select
                                        value={user.role === 'client' ? 'pod_member' : user.role}
                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="pod_lead">Pod Lead</option>
                                        <option value="pod_member">Pod Member</option>
                                    </select>

                                    {/* Pod Selector - Show for pod_lead and pod_member only (admin doesn't need pod) */}
                                    {(user.role === 'pod_lead' || user.role === 'pod_member') && (
                                      <select
                                          value={user.pod_id || ''}
                                          onChange={(e) => handleUpdatePod(user.id, e.target.value)}
                                          className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[100px]"
                                      >
                                          <option value="">No Pod</option>
                                          {activePods(pods).map(pod => (
                                              <option key={pod.id} value={pod.id}>{pod.name}</option>
                                          ))}
                                      </select>
                                    )}
                                </div>
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
                            newKeyReveal={newKeyReveal}
                            onCloseKeyReveal={() => setNewKeyReveal(null)}
                            onCreateBrand={handleCreateBrand}
                            onUpdateBrand={handleSaveBrand}
                            onRotateKey={handleRotateBrandKey}
                            onArchiveBrand={handleArchiveBrand}
                            dropLink={dropLink}
                            copyToClipboard={copyToClipboard}
                            slugFromName={slugFromName}
                        />
                    )}
                </section>
              </>
          )}

          {newKeyReveal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setNewKeyReveal(null)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-[#111111] mb-2">Access key (show once)</h3>
                <p className="text-xs text-gray-500 mb-4">Copy and share with the client. It cannot be retrieved later.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button type="button" onClick={() => copyToClipboard(dropLink(newKeyReveal.slug, newKeyReveal.key))} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
                    <Copy size={14} /> Copy link
                  </button>
                  <button type="button" onClick={() => copyToClipboard(newKeyReveal.key)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
                    <Copy size={14} /> Copy access key
                  </button>
                </div>
                <p className="text-xs text-gray-400 break-all font-mono mb-4">{newKeyReveal.key}</p>
                <button type="button" onClick={() => setNewKeyReveal(null)} className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Done</button>
              </div>
            </div>
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
  );
};