import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: userContextError, currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) navigate('/');
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Don't navigate here - useEffect will redirect when currentUser is set by UserContext
    } catch (err: any) {
      if (err.name !== 'AbortError') setLocalError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[#111111] mb-2 tracking-tight">Dropam OS</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in to your workspace</p>
        
        {/* Context Level Error (Missing Tables) */}
        {userContextError && (
             <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg mb-4 flex gap-2 items-start">
                 <AlertCircle size={14} className="shrink-0 mt-0.5" />
                 <span>{userContextError}</span>
             </div>
        )}

        {/* Local Error */}
        {localError && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4">{localError}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Email</label>
                <input 
                    type="email" required 
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111]"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Password</label>
                <input 
                    type="password" required 
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#111111]"
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full h-10 bg-[#111111] text-white rounded-lg text-sm font-medium flex items-center justify-center hover:scale-[1.02] transition-transform"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Sign In'}
            </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <p className="text-gray-500">No account? <Link to="/signup" className="text-[#111111] font-bold">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};