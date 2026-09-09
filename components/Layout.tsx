import React, { useState, useEffect } from 'react';
import { LogOut, Camera, LayoutDashboard, FileText, Loader2, Menu, X, Users, TrendingUp, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uploading, progress, cancelUpload } = useUpload();
  const [userId, setUserId] = useState<string | null>(null);
  
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchCounts(user.id);
      }
    });
  }, []);
  
  const fetchCounts = async (uid: string) => {
    const { data } = await supabase.from('galleries').select('category').eq('photographer_id', uid);
    if (data) {
        setPortfolioCount(data.filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT').length);
        setDeliveryCount(data.filter(g => !g.category || g.category.trim() === '').length);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isGalleryManager = location.pathname.startsWith('/gallery/');
  const isPages = location.search.includes('view=pages');

  return (
    <div className="h-screen w-full flex bg-[#F9F9F9] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[240px] bg-[#111111] text-[#A1A1AA] h-screen sticky top-0 flex flex-col py-8 border-r border-[#222] shrink-0">
        <div className="px-6 mb-10">
          <h1 className="text-white text-[22px] font-serif tracking-wide" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Mwabonje</h1>
          <p className="text-slate-500 text-[11px] mt-1">Studio Console</p>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">General</h2>
            <div className="px-3">
              <div onClick={() => navigate('/dashboard')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors hover:text-white hover:bg-[#222]`}>
                <LayoutGrid className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Overview</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Content</h2>
            <div className="px-3 space-y-0.5">
              <div onClick={() => navigate('/dashboard?view=galleries')} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]`}>
                <div className="flex items-center">
                  <ImageIcon className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Galleries</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">{portfolioCount}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Proposals</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">6</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=delivery')} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group ${isGalleryManager ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Delivery</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">{deliveryCount}</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=blogs')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors hover:text-white hover:bg-[#222]`}>
                <div className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Blog</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=pages')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${isPages ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Pages</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Business</h2>
            <div className="px-3 space-y-0.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  </div>
                  <span className="text-[13px] font-medium">Print orders</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">3</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <span className="text-[13px] font-medium">Messages</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">4</span>
              </div>
            </div>
          </div>
        </div>

        {uploading && (
            <div className="px-6 mb-4">
                <div className="bg-[#222] rounded-lg p-3 border border-[#333]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            Uploading...
                        </span>
                        <span className="text-xs text-emerald-400 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden mb-3">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <button 
                        onClick={cancelUpload}
                        className="w-full text-xs text-center text-rose-400 hover:text-rose-300 font-medium py-1 hover:bg-[#333] rounded transition-colors"
                    >
                        Cancel Upload
                    </button>
                </div>
            </div>
        )}

        <div className="pt-4 px-6 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B9822A] flex items-center justify-center text-white text-[11px] font-bold">
                J
            </div>
            <div>
                <div className="text-[13px] font-bold text-white leading-none">JAMBO</div>
                <div className="text-[10px] text-slate-500 mt-1">Studio owner</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
