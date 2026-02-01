import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ActionProvider } from './contexts/ActionContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClientDropPage } from './pages/ClientDropPage';
import { PodCanvasPage } from './pages/PodCanvasPage';
import { AdminCanvasPage } from './pages/AdminCanvasPage';
import { SettingsPage } from './pages/SettingsPage';
import { NoAccessPage } from './pages/NoAccessPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { CommandPalette } from './components/CommandPalette';

const LogoutRedirect: React.FC = () => {
  const { signOut } = useUser();
  React.useEffect(() => {
    signOut().then(() => window.location.replace('/#/login'));
  }, [signOut]);
  return <LoadingScreen />;
};
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F5F5F7] text-[#111111] gap-4">
    <Loader2 className="animate-spin" size={32} />
    <span className="text-xs font-medium tracking-widest uppercase opacity-50">Initializing Dropam OS</span>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.JSX.Element }> = ({ children }) => {
  const { currentUser, isLoading, initialized } = useUser();

  // Wait for auth to fully initialize before making any decisions
  if (!initialized || isLoading) return <LoadingScreen />;

  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const RootRedirect: React.FC = () => {
    const { currentUser, isLoading, initialized } = useUser();
    const { pods, loading: dataLoading } = useData();
    const activePods = pods.filter((p: { archivedAt?: string }) => !p.archivedAt);

    // Wait for auth to fully initialize
    if (!initialized || isLoading || dataLoading) return <LoadingScreen />;
    if (!currentUser) return <Navigate to="/login" replace />;

    // Admin always lands on the All PODS dashboard (all briefs on one canvas)
    if (currentUser.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    // Check memberships for pod access
    const activeMemberships = currentUser.memberships?.filter(m => m.status === 'active') || [];

    if (activeMemberships.length > 0) {
        // Redirect to first active membership's pod
        const firstMembership = activeMemberships[0];
        const pod = activePods.find((p: { id: string }) => p.id === firstMembership.podId);
        if (pod) return <Navigate to={`/pod/${pod.slug}`} replace />;
    }

    // Fallback: check legacy podId field for backward compatibility
    if (currentUser.podId) {
        const pod = activePods.find((p: { id: string }) => p.id === currentUser.podId);
        if (pod) return <Navigate to={`/pod/${pod.slug}`} replace />;
    }

    return <Navigate to="/no-access" replace />;
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ToastProvider>
          <DataProvider>
            <ActionProvider>
              <HashRouter>
                <CommandPalette />
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/logout" element={<LogoutRedirect />} />

                  <Route path="/drop/:shareToken" element={<ClientDropPage />} />

                  <Route path="/no-access" element={
                    <ProtectedRoute><NoAccessPage /></ProtectedRoute>
                  } />

                  <Route path="/pod/:podSlug" element={
                    <ProtectedRoute><PodCanvasPage /></ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute><AdminCanvasPage /></ProtectedRoute>
                  } />

                  <Route path="/settings" element={
                    <ProtectedRoute><SettingsPage /></ProtectedRoute>
                  } />

                  <Route path="/" element={<RootRedirect />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </HashRouter>
            </ActionProvider>
          </DataProvider>
        </ToastProvider>
      </UserProvider>
    </ErrorBoundary>
  );
};

export default App;