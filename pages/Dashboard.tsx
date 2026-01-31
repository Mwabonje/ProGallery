import React, { useEffect, useState } from 'react';
import { Plus, ExternalLink, Clock, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleries(data || []);
    } catch (error) {
      console.error('Error loading galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGallery = async () => {
    const clientName = prompt("Enter Client Name:");
    if (!clientName) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: clientName,
          title: `${clientName}'s Gallery`,
          agreed_balance: 100, // Default, can be changed
          amount_paid: 0,
          link_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      navigate(`/gallery/${data.id}`);
    } catch (error) {
      alert('Error creating gallery');
      console.error(error);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your client deliveries</p>
        </div>
        <button
          onClick={createGallery}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Delivery</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleries.map((gallery) => (
          <div 
            key={gallery.id} 
            onClick={() => navigate(`/gallery/${gallery.id}`)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {gallery.client_name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  gallery.link_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {gallery.link_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                  <DollarSign className="w-4 h-4 mr-2 text-slate-400" />
                  <span className={gallery.amount_paid >= gallery.agreed_balance ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {formatCurrency(gallery.amount_paid)} / {formatCurrency(gallery.agreed_balance)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Created {formatDate(gallery.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
              <span>View details</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        ))}

        {galleries.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No galleries yet. Create your first delivery!</p>
          </div>
        )}
      </div>
    </div>
  );
};