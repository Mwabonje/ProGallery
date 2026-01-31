import React from 'react';
import { LogOut, Camera, LayoutDashboard, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uploading, progress } = useUpload();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <aside className="bg-slate-900 text-white w-full md:w-64 flex-shrink-0 flex flex-col justify-between z-20">
        <div>
          <div className="p-6 flex items-center space-x-3 border-b border-slate-700">
            <Camera className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-bold tracking-tight">ProGallery</span>
          </div>
          
          <nav className="mt-6 px-4 space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            {/* Future settings link could go here */}
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
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};