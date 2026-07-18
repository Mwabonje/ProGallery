import React, { useState, useEffect } from 'react';
import { LogOut, Camera, LayoutDashboard, FileText, Loader2, Menu, X, Users, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uploading, progress, cancelUpload } = useUpload();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Listen to gallery updates to show real-time notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'galleries',
          filter: `photographer_id=eq.${userId}`
        },
        (payload) => {
          const newGallery = payload.new;
          const oldGallery = payload.old;
          
          if (oldGallery && oldGallery.selection_status !== 'submitted' && newGallery.selection_status === 'submitted') {
            toast.success(`Client ${newGallery.client_name} submitted their photo selection!`, {
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#09090b] text-slate-50 p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2">
           <Camera className="w-6 h-6 text-emerald-400" />
           <span className="text-xl font-bold tracking-tight font-serif" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Mwabonje</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 -mr-2 rounded-md hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#09090b] text-slate-50 transform transition-transform duration-300 ease-in-out shadow-xl
        md:relative md:translate-x-0 md:shadow-none flex flex-col justify-between
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="p-6 hidden md:flex items-center space-x-3 border-b border-slate-700">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-bold tracking-tight font-serif" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Mwabonje</span>
          </div>
          
          <nav className="mt-6 px-4 space-y-2">
            <button
              onClick={() => {
                navigate('/dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/dashboard') && !location.search.includes('view=')
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                navigate('/dashboard?view=audience');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.search.includes('view=audience')
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Audience Overview</span>
            </button>
            <button
              onClick={() => {
                navigate('/dashboard?view=blogs');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.search.includes('view=blogs')
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Blog Manager</span>
            </button>
            <button
              onClick={() => {
                navigate('/dashboard?view=performance');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.search.includes('view=performance')
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Performance</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700 space-y-4">
          {/* Upload Status in Sidebar */}
          {uploading && (
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                        Uploading...
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <button 
                  onClick={cancelUpload}
                  className="w-full text-xs text-center text-rose-400 hover:text-rose-300 font-medium py-1 hover:bg-slate-700 rounded transition-colors"
                >
                  Cancel Upload
                </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen relative bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};