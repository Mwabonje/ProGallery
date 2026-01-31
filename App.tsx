import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GalleryManager } from './pages/GalleryManager';
import { ClientGallery } from './pages/ClientGallery';
import { Session } from '@supabase/supabase-js';
import { UploadProvider } from './contexts/UploadContext';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real Supabase Session Check
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
    <UploadProvider>
      <Router>
        <Switch>
          {/* Public Routes */}
          <Route path="/login" render={() => !session ? <Login /> : <Redirect to="/dashboard" />} />
          <Route path="/g/:galleryId" component={ClientGallery} />

          {/* Protected Photographer Routes */}
          <Route path="/dashboard" render={() => 
            session ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : <Redirect to="/login" />
          } />
          
          <Route path="/gallery/:id" render={() => 
            session ? (
              <Layout>
                <GalleryManager />
              </Layout>
            ) : <Redirect to="/login" />
          } />

          {/* Default */}
          <Route path="*" render={() => <Redirect to={session ? "/dashboard" : "/login"} />} />
        </Switch>
      </Router>
    </UploadProvider>
  );
};

export default App;