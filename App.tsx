import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GalleryManager } from './pages/GalleryManager';
import { ClientGallery } from './pages/ClientGallery';
import { Session } from '@supabase/supabase-js';
import { UploadProvider } from './contexts/UploadContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';

import { Portfolio } from './pages/Portfolio';
import { LiveDisplay } from './pages/LiveDisplay';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { About } from './pages/About';
import { FAQ } from './pages/FAQ';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for hash parameters for auth (e.g. access_token, error, type=signup)
    const hash = window.location.hash;
    const isAuthRedirect = hash && (hash.includes('access_token') || hash.includes('error') || hash.includes('type='));

    // If we are NOT processing an auth redirect, we can check the local storage session immediately.
    // If we ARE processing a redirect, we wait for onAuthStateChange to fire to avoid race conditions.
    if (!isAuthRedirect) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
        if (session?.user?.id) {
          supabase
            .from('galleries')
            .update({ link_enabled: true })
            .eq('photographer_id', session.user.id)
            .in('category', ['SETTINGS', 'ABOUT'])
            .eq('link_enabled', false)
            .then(() => {});

          supabase
            .from('galleries')
            .select('id, title')
            .eq('photographer_id', session.user.id)
            .eq('category', 'SETTINGS')
            .then(({ data: gals }) => {
              if (gals && gals.length > 0) {
                for (const g of gals) {
                  if (g.title) {
                    try {
                      const p = JSON.parse(g.title);
                      if (p.heroTitle && (p.heroTitle.includes('Salt, light') || p.heroTitle.includes('*slow*') || p.heroTitle === 'Hospitality, Portraits & Documentary Photography')) {
                        p.heroTitle = "Visual Storyteller\n& *Lifestyle* Photographer";
                        p.heroSubtitle = "Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.";
                        supabase.from('galleries').update({ title: JSON.stringify(p), link_enabled: true }).eq('id', g.id).then(() => {});
                      }
                    } catch(e) {}
                  }
                }
              }
            }).catch(() => {});
        }
      }).catch((err) => {
        console.warn("Supabase session check failed:", err);
        setLoading(false);
      });
    }

    // Listen for auth changes (this handles the hash parsing for magic links/confirmations)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        supabase
          .from('galleries')
          .update({ link_enabled: true })
          .eq('photographer_id', session.user.id)
          .in('category', ['SETTINGS', 'ABOUT'])
          .eq('link_enabled', false)
          .then(() => {});

        supabase
          .from('galleries')
          .select('id, title')
          .eq('photographer_id', session.user.id)
          .eq('category', 'SETTINGS')
          .then(({ data: gals }) => {
            if (gals && gals.length > 0) {
              for (const g of gals) {
                if (g.title) {
                  try {
                    const p = JSON.parse(g.title);
                    if (p.heroTitle && (p.heroTitle.includes('Salt, light') || p.heroTitle.includes('*slow*') || p.heroTitle === 'Hospitality, Portraits & Documentary Photography')) {
                      p.heroTitle = "Visual Storyteller\n& *Lifestyle* Photographer";
                      p.heroSubtitle = "Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.";
                      supabase.from('galleries').update({ title: JSON.stringify(p), link_enabled: true }).eq('id', g.id).then(() => {});
                    }
                  } catch(e) {}
                }
              }
            }
          }).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-400">Loading...</div>;

  return (
    <ThemeProvider>
      <UploadProvider>
        <Toaster position="top-center" richColors />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Portfolio />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/admin" element={!session ? <Navigate to="/login" /> : <Navigate to="/dashboard" />} />
            <Route path="/g/:galleryId" element={<ClientGallery />} />
            <Route path="/g/:galleryId/display" element={<LiveDisplay />} />
            <Route path="/p/:photographerId" element={<Portfolio />} />
            <Route path="/prints" element={<Navigate to="/" replace />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />

            {/* Protected Photographer Routes */}
            <Route path="/dashboard" element={
              session ? (
                  <Dashboard />
              ) : <Navigate to="/login" />
            } />
            
            <Route path="/gallery/:id" element={
              session ? (
                <Layout>
                  <GalleryManager />
                </Layout>
              ) : <Navigate to="/login" />
            } />

            {/* Vanity URL for Galleries (must be last before catch-all) */}
            <Route path="/:galleryId" element={<ClientGallery />} />

            {/* Default */}
            <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
          </Routes>
        </Router>
      </UploadProvider>
    </ThemeProvider>
  );
};

export default App;