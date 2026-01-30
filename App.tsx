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
import { CommandPalette } from './components/CommandPalette';
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
    const { pods, brands, loading: dataLoading } = useData();

    if (isLoading || dataLoading) return <LoadingScreen />;
    if (!currentUser) return <Navigate to="/login" replace />;

    // Routing Logic
    if (currentUser.role === 'client') {
        if (currentUser.brandId) {
            const brand = brands.find(b => b.id === currentUser.brandId);
            if (brand) return <Navigate to={`/drop/${brand.slug}`} replace />;
        }
        // If client has no brand assigned, fallback to no-access
        return <Navigate to="/no-access" replace />; 
    }

    if (currentUser.podId) {
        const pod = pods.find(p => p.id === currentUser.podId);
        if (pod) return <Navigate to={`/pod/${pod.slug}`} replace />;
    }

    if (currentUser.role === 'admin' && pods.length > 0) {
         return <Navigate to={`/pod/${pods[0].slug}`} replace />;
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
              
              <Route path="/drop/:brandSlug" element={
                 <ProtectedRoute><ClientDropPage /></ProtectedRoute> 
              } />
              
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