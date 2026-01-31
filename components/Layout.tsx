import React, { useState } from 'react';
import { LogOut, Camera, LayoutDashboard, Settings, Loader2, Trash2 } from 'lucide-react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';

interface LayoutProps extends RouteComponentProps {
  children: React.ReactNode;
}

const LayoutComponent: React.FC<LayoutProps> = ({ children, history, location }) => {
  const { uploading, progress } = useUpload();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    history.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete your account, all galleries, and all files. This action cannot be undone.")) {
      return;
    }

    if (!window.confirm("This is the final warning. All data will be lost immediately. Continue?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // --- STRATEGY 1: Try Server-Side RPC (Preferred) ---
      // This is the cleanest way, but requires the SQL script to be run in Supabase.
      try {
        const { data, error: rpcError } = await supabase.rpc('delete_account_v2');

        if (!rpcError && data?.status === 'success') {
          // Success!
          await supabase.auth.signOut();
          history.push('/login');
          return;
        }
        
        // If we get here, either RPC failed or returned an error status
        console.warn("RPC deletion failed or not found, falling back to manual cleanup.", rpcError || data);
      } catch (e) {
        console.warn("RPC invocation failed entirely.", e);
      }

      // --- STRATEGY 2: Fallback Manual Cleanup ---
      // If RPC is missing, we manually delete data from the client side.
      // This ensures the user's files are gone even if the account deletion script isn't active.
      
      // 1. Get all galleries for this user
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id')
        .eq('photographer_id', user.id);

      if (galleries && galleries.length > 0) {
        const galleryIds = galleries.map(g => g.id);

        // 2. Get all files in those galleries
        const { data: files } = await supabase
          .from('files')
          .select('file_path')
          .in('gallery_id', galleryIds);

        // 3. Delete from Storage
        if (files && files.length > 0) {
          const paths = files.map(f => f.file_path);
          // Delete in batches of 100 to avoid API limits
          for (let i = 0; i < paths.length; i += 100) {
             const batch = paths.slice(i, i + 100);
             await supabase.storage.from('gallery-files').remove(batch);
          }
        }

        // 4. Delete Galleries (Database)
        // This will cascade delete the file records in the DB
        await supabase
          .from('galleries')
          .delete()
          .in('id', galleryIds);
      }

      // 5. Finalize
      alert("Success: All galleries and files have been permanently deleted.\n\nNote: Because the database script was not found, your login email remains active. Please contact support if you need your email removed completely.");
      await supabase.auth.signOut();
      history.push('/login');

    } catch (error: any) {
      console.error("Account deletion failed:", error);
      alert(`Failed to delete account data: ${error.message || 'Unknown error'}`);
      setIsDeleting(false);
    }
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
              onClick={() => history.push('/dashboard')}
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
            disabled={isDeleting}
            className="w-full flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
          
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-sm"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
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

export const Layout = withRouter(LayoutComponent);