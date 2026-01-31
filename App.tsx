import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, isDemoMode } from './services/supabase';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GalleryManager } from './pages/GalleryManager';
import { ClientGallery } from './pages/ClientGallery';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for Demo Session
    if (isDemoMode) {
      const demoUser = localStorage.getItem('demo_user');
      if (demoUser) {
        setSession({ user: { id: 'demo-user', email: 'demo@example.com' } } as any);
      }
      setLoading(false);
      return; 
    }

    // 2. Real Supabase Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((err) => {
      console.warn("Supabase session check failed:", err);
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-400">Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/g/:galleryId" element={<ClientGallery />} />

        {/* Protected Photographer Routes */}
        <Route path="/dashboard" element={
          session ? (
            <Layout>
              <Dashboard />
            </Layout>
          ) : <Navigate to="/login" />
        } />
        
        <Route path="/gallery/:id" element={
          session ? (
            <Layout>
              <GalleryManager />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        {/* Default */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;
