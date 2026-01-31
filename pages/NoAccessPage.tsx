import React, { useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { Link, useNavigate } from 'react-router-dom';

export const NoAccessPage: React.FC = () => {
  const { currentUser, signOut, error } = useUser();
  const navigate = useNavigate();

  // Admins should always use the All PODS dashboard, not this page
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [currentUser?.role, navigate]);

  // If user has a pod assigned, redirect to their pod
  useEffect(() => {
    if (currentUser?.podId) {
      navigate('/', { replace: true });
    }
  }, [currentUser?.podId, navigate]);

  // Admins are redirected; avoid flashing no-access content
  if (currentUser?.role === 'admin') return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-[#111111] mb-2 tracking-tight">Dropam OS</h1>

        {currentUser && (
          <p className="text-gray-500 mb-8 text-sm">
            Signed in as <span className="font-medium text-[#111111]">{currentUser.name || currentUser.email}</span>
          </p>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
          {error ? (
            <>
              <p className="text-sm text-gray-600 mb-2">Unable to load your profile.</p>
              <p className="text-xs text-gray-400">{error}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">You don't have access to a POD yet.</p>
              <p className="text-xs text-gray-400">Contact your admin to get access to your workspace.</p>
            </>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-[#111111] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity mb-4"
        >
          Sign Out
        </button>

        <Link
          to="/login"
          className="text-xs text-gray-400 hover:text-[#111111] underline decoration-gray-300 underline-offset-4"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
};
