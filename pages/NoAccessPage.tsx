import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutGrid, Droplets, Database, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const NoAccessPage: React.FC = () => {
  const { currentUser, refetchUser } = useUser();
  const { pods, brands, loading } = useData();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);

  // Admins should always use the All PODS dashboard, not this page
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [currentUser?.role, navigate]);

  const handleInitialize = async () => {
    setSeeding(true);
    try {
        // 1. Create Pod first (bootstrap allows any authenticated user when pod count = 0)
        const { data: pod, error: podError } = await supabase
            .from('pods')
            .insert({
                name: 'POD 1',
                slug: 'pod-1',
                lead_name: currentUser?.name || 'Lead',
                lead_id: currentUser?.id
            })
            .select()
            .single();

        if (podError) {
             if (podError.code === '42P01') {
                 alert("Database tables missing!\n\nPlease run supabase_schema.sql in your Supabase SQL Editor first.");
                 return;
             }
             if (podError.code === '42501' || podError.message?.includes('policy') || podError.message?.includes('permission')) {
                 alert("Permission denied.\n\nPlease run the RLS fix in your Supabase SQL Editor.\nSee: supabase/migrations/001_profiles_auth_rls.sql");
                 return;
             }
             throw podError;
        }

        // 2. Promote current user to admin and assign to this pod (Users can update own profile)
        if (currentUser?.id) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ pod_id: pod.id, role: 'admin' })
                .eq('id', currentUser.id);
            if (profileError && (profileError.code === '42501' || profileError.message?.includes('policy') || profileError.message?.includes('permission'))) {
                alert("Permission denied updating profile.\n\nEnsure RLS allows 'Users update own profile'. See: supabase/migrations/001_profiles_auth_rls.sql");
                return;
            }
        }

        // 3. Create sample Brands
        const { error: brandError } = await supabase
            .from('brands')
            .insert([
                { name: 'Sparkle', slug: 'sparkle', pod_id: pod.id },
                { name: 'Access Bank', slug: 'access', pod_id: pod.id },
                { name: 'Cardinal Stone', slug: 'cardinalstone', pod_id: pod.id }
            ]);

        if (brandError && brandError.code !== '23505') {
            console.warn("Brand creation warning:", brandError);
        }

        // 4. Create initial folder
        await supabase.from('folders').insert({
             pod_id: pod.id,
             name: 'Archive Q1',
             position_x: 50,
             position_y: 550
        });

        await refetchUser();
        window.location.reload();

    } catch (err: any) {
        console.error("Initialization failed:", err);
        const message = err?.message || 'Unknown error';
        if (message.includes('policy') || message.includes('permission') || err?.code === '42501') {
            alert("Permission denied.\n\nTo fix this, please update the RLS policies in your Supabase database.\n\nRun the SQL from: supabase/migrations/001_profiles_auth_rls.sql");
        } else {
            alert(`Initialization failed: ${message}`);
        }
    } finally {
        setSeeding(false);
    }
  };

  const isClient = currentUser.role === 'client';
  const isAdmin = currentUser.role === 'admin';
  const isPodMember = currentUser.role === 'pod_member' || currentUser.role === 'pod_lead';
  const clientNoBrand = isClient && !currentUser.brandId;
  const podMemberNoPod = isPodMember && !currentUser.podId;

  // Admins are redirected to /admin by useEffect; avoid flashing no-access content
  if (isAdmin) return null;

  // Pod members without a pod should see a simple "contact admin" message
  if (podMemberNoPod && pods.length > 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-[#111111] mb-2 tracking-tight">Dropam OS</h1>
          <p className="text-gray-500 mb-8">
            Logged in as <span className="font-semibold text-[#111111]">{currentUser.name}</span>
          </p>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-2">You haven&apos;t been assigned to a pod yet.</p>
            <p className="text-xs text-gray-400">Contact your admin to get access to your workspace.</p>
          </div>
          <div className="mt-8">
            <Link to="/logout" className="text-xs text-gray-400 hover:text-[#111111] underline decoration-gray-300 underline-offset-4">
                Sign Out
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-2xl w-full">

        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-[#111111] mb-2 tracking-tight">Dropam OS</h1>
            <p className="text-gray-500">
                Logged in as <span className="font-semibold text-[#111111]">{currentUser.name}</span> ({currentUser.role})
            </p>
        </div>

        {/* Directory Grid - Only show to admins or during initialization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Pods Column - Only for admins or when system needs initialization */}
            {isAdmin && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-2 mb-6 text-[#111111]">
                        <LayoutGrid size={20} />
                        <h2 className="font-bold">Active Pods</h2>
                    </div>
                    <Link
                        to="/admin"
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group mb-2 border border-gray-100"
                    >
                        <span className="text-sm font-medium text-gray-700 group-hover:text-[#111111]">All PODS</span>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-[#111111] transition-colors" />
                    </Link>

                    {loading ? (
                        <div className="h-20 flex items-center justify-center text-xs text-gray-400">Loading Pods...</div>
                    ) : pods.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] text-center">
                            <p className="text-xs text-gray-400 mb-4">No pods found.</p>
                            <button
                                onClick={handleInitialize}
                                disabled={seeding}
                                className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                {seeding ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                                Initialize System
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pods.map(pod => (
                                <Link
                                    key={pod.id}
                                    to={`/pod/${pod.slug}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                >
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#111111]">{pod.name}</span>
                                    <ArrowRight size={14} className="text-gray-300 group-hover:text-[#111111] transition-colors" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Initialize button for non-admins when system is empty */}
            {!isAdmin && !isClient && pods.length === 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:col-span-2">
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] text-center">
                        <p className="text-xs text-gray-400 mb-4">System not initialized yet.</p>
                        <button
                            onClick={handleInitialize}
                            disabled={seeding}
                            className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded-lg hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            {seeding ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                            Initialize System
                        </button>
                    </div>
                </div>
            )}

            {/* Brands Column - Only for admins or clients */}
            {(isAdmin || isClient) && (
                <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col ${isClient ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-6 text-[#111111]">
                        <Droplets size={20} />
                        <h2 className="font-bold">Client Drops</h2>
                    </div>

                    {clientNoBrand ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] text-center">
                            <p className="text-sm text-gray-600">Your account isn&apos;t assigned to a brand yet.</p>
                            <p className="text-xs text-gray-400 mt-2">Contact your Creative Director to get access.</p>
                        </div>
                    ) : loading ? (
                        <div className="h-20 flex items-center justify-center text-xs text-gray-400">Loading Brands...</div>
                    ) : brands.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[120px]">
                            <p className="text-xs text-gray-400">No brands found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(isClient ? brands.filter(b => b.id === currentUser.brandId) : brands).map(brand => (
                                <Link
                                    key={brand.id}
                                    to={`/drop/${brand.slug}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                >
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#111111]">{brand.name}</span>
                                    <ArrowRight size={14} className="text-gray-300 group-hover:text-[#111111] transition-colors" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>

        <div className="mt-12 text-center">
            <Link to="/settings" className="text-xs text-gray-400 hover:text-[#111111] underline decoration-gray-300 underline-offset-4">
                System Settings
            </Link>
        </div>

      </div>
    </div>
  );
};