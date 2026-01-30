import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ActionProvider } from './contexts/ActionContext';
import { ClientDropPage } from './pages/ClientDropPage';
import { PodCanvasPage } from './pages/PodCanvasPage';
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
  const { currentUser, isLoading } = useUser();
  if (isLoading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const RootRedirect: React.FC = () => {
    const { currentUser, isLoading } = useUser();
    const { pods, loading: dataLoading } = useData();
    const activePods = pods.filter((p: { archivedAt?: string }) => !p.archivedAt);

    if (isLoading || dataLoading) return <LoadingScreen />;
    if (!currentUser) return <Navigate to="/login" replace />;

    if (currentUser.podId) {
        const pod = activePods.find((p: { id: string }) => p.id === currentUser.podId);
        if (pod) return <Navigate to={`/pod/${pod.slug}`} replace />;
    }

    if (currentUser.role === 'admin' && activePods.length > 0) {
        return <Navigate to={`/pod/${activePods[0].slug}`} replace />;
    }

    return <Navigate to="/no-access" replace />;
}

const App: React.FC = () => {
  return (
    <UserProvider>
      <DataProvider>
        <ActionProvider>
          <HashRouter>
            <CommandPalette />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/logout" element={<LogoutRedirect />} />
              
              <Route path="/drop/:brandSlug" element={<ClientDropPage />} />
              
              <Route path="/no-access" element={
                  <ProtectedRoute><NoAccessPage /></ProtectedRoute>
              } />
              
              <Route path="/pod/:podSlug" element={
                  <ProtectedRoute><PodCanvasPage /></ProtectedRoute>
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
    </UserProvider>
  );
};

export default App;