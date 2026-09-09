import React, { useState } from 'react';
import { Settings, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { AboutSettingsModal } from '../components/AboutSettingsModal';
import { HomeSettingsModal } from '../components/HomeSettingsModal';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext'; // if it exists, otherwise get from session

export const PagesAdmin: React.FC = () => {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const pages = [
    {
      id: 'home',
      title: 'Home',
      path: '/',
      status: 'Live',
      lastEdited: 'Recently',
      action: 'Edit hero text',
      onClick: () => setIsHomeModalOpen(true),
      disabled: false,
    },
    {
      id: 'about',
      title: 'About',
      path: '/about',
      status: 'Live',
      lastEdited: 'Recently',
      action: 'Edit content & image',
      onClick: () => setIsAboutModalOpen(true),
      disabled: false,
    },
    {
      id: 'contact',
      title: 'Contact',
      path: '/contact',
      status: 'Live',
      lastEdited: 'Recently',
      action: 'Edit form settings',
      disabled: true,
    }
  ];

  return (
    <div className="max-w-[1200px] mx-auto p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[28px] text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Pages</h1>
          <p className="text-slate-500 text-[14px]">Manage your public website pages and content.</p>
        </div>
      </div>

      <div className="bg-white rounded-[10px] border border-[#e2e8f0] overflow-hidden">
        <div className="grid grid-cols-[3fr_1fr_1.5fr_2fr] px-6 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
          <div>Page</div>
          <div>Status</div>
          <div>Last Updated</div>
          <div className="text-right">Action</div>
        </div>
        
        {pages.map((page) => (
          <div key={page.id} className="grid grid-cols-[3fr_1fr_1.5fr_2fr] items-center px-6 py-4 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[14px] font-medium text-slate-900">{page.title}</div>
                <div className="text-[12px] text-slate-500 font-mono mt-0.5">{page.path}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[12px] font-medium text-slate-700">{page.status}</span>
            </div>
            
            <div className="text-[12px] text-slate-500">
              {page.lastEdited}
            </div>
            
            <div className="flex justify-end">
              {page.disabled ? (
                <button className="px-4 py-2 bg-slate-100 text-slate-400 rounded-md text-[12px] font-medium cursor-not-allowed">
                  Coming Soon
                </button>
              ) : (
                <button 
                  onClick={page.onClick}
                  className="px-4 py-2 bg-[#5845EE] text-white hover:bg-[#4a3bcc] rounded-md text-[12px] font-medium transition-colors shadow-sm"
                >
                  {page.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isHomeModalOpen && userId && (
        <HomeSettingsModal 
          onClose={() => setIsHomeModalOpen(false)}
          userId={userId}
        />
      )}

      {isAboutModalOpen && userId && (
        <AboutSettingsModal 
          onClose={() => setIsAboutModalOpen(false)}
          userId={userId}
        />
      )}
    </div>
  );
};
