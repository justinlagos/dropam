import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, BarChart, User as UserIcon, Users, Building2 } from 'lucide-react';
import { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useUser();
  const { briefs, pods, brands } = useData();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  const handleUpdateRole = async (userId: string, newRole: string) => {
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
                        {profiles.filter(p => p.role !== 'client').map(p => {
                            const count = briefs.filter(b => b.ownerId === p.id && ['in_progress', 'review'].includes(b.status)).length;
                            return (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                    <span>{p.name || p.email}</span>
                                    <span className={`font-bold px-2 py-1 rounded ${count > 5 ? 'bg-red-100 text-red-600' : 'bg-white'}`}>
                                        {count} Active
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-[#111111]">
                        <Users size={18} />
                        <h2 className="font-bold">Manage People</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {profiles.map(user => (
                            <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                                    <p className="text-xs text-gray-400">{user.email}</p>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {/* Role Selector */}
                                    <select 
                                        value={user.role}
                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="pod_lead">Pod Lead</option>
                                        <option value="creative">Creative</option>
                                        <option value="client">Client</option>
                                    </select>

                                    {/* Pod Selector (for creatives) */}
                                    {user.role !== 'client' && (
                                        <select
                                            value={user.pod_id || ''}
                                            onChange={(e) => handleUpdatePod(user.id, e.target.value)}
                                            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[100px]"
                                        >
                                            <option value="">No Pod</option>
                                            {pods.map(pod => (
                                                <option key={pod.id} value={pod.id}>{pod.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Brand Selector (for clients) */}
                                    {user.role === 'client' && (
                                        <select
                                            value={user.brand_id || ''}
                                            onChange={(e) => handleUpdateBrand(user.id, e.target.value)}
                                            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[100px]"
                                        >
                                            <option value="">No Brand</option>
                                            {brands.map(brand => (
                                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
              </>
          )}

          <button 
            onClick={signOut}
            className="w-full h-10 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>

        </div>
      </div>
    </div>
  );
};