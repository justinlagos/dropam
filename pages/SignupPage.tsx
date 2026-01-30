import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: userContextError, currentUser } = useUser();
  const { brands, loading: brandsLoading } = useData();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'client' | 'team'>('team');
  const [brandId, setBrandId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) navigate('/');
  }, [currentUser, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    try {
      const metadata: Record<string, string> = { name: name || email?.split('@')[0] || 'User' };
      if (accountType === 'client' && brandId) {
        metadata.role = 'client';
        metadata.brand_id = brandId;
      } else {
        metadata.role = 'pod_member';
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) throw error;

      if (data.user && !data.session) {
        alert('Account created! Check your email to confirm, then sign in.');
        navigate('/login');
      } else if (data.session) {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLocalError(err.message || 'Sign up failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[#111111] mb-2 tracking-tight">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Join Dropam OS</p>

        {userContextError && (
          <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg mb-4 flex gap-2 items-start">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{userContextError}</span>
          </div>
        )}
        {localError && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4">{localError}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111]"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111]"
              minLength={6}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">Account type</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  checked={accountType === 'team'}
                  onChange={() => setAccountType('team')}
                  className="text-[#111111]"
                />
                <span className="text-sm">Team member</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  checked={accountType === 'client'}
                  onChange={() => setAccountType('client')}
                  className="text-[#111111]"
                />
                <span className="text-sm">Client</span>
              </label>
            </div>
          </div>

          {accountType === 'client' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Brand (optional)</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111] bg-white"
              >
                <option value="">No brand — admin will assign later</option>
                {brandsLoading ? (
                  <option>Loading…</option>
                ) : (
                  brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Leave blank if you don&apos;t know. Admin can assign later.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#111111] text-white rounded-lg text-sm font-medium flex items-center justify-center hover:scale-[1.02] transition-transform disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Have an account? <Link to="/login" className="text-[#111111] font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
