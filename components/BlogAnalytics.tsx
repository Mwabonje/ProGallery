import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { TrendingUp, FileText, Loader2, Eye, MousePointerClick } from 'lucide-react';

export const BlogAnalytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: blogs, error } = await supabase
        .from('blogs')
        .select('title, views, clicks')
        .order('views', { ascending: false });

      if (error) throw error;

      if (blogs) {
        // Prepare data for recharts
        const chartData = blogs.map(blog => ({
          name: blog.title.length > 30 ? blog.title.substring(0, 30) + '...' : blog.title,
          views: blog.views || 0,
          clicks: blog.clicks || 0,
          fullTitle: blog.title
        }));

        setData(chartData);
        setTotalViews(chartData.reduce((acc, curr) => acc + curr.views, 0));
        setTotalClicks(chartData.reduce((acc, curr) => acc + curr.clicks, 0));
      }
    } catch (err) {
      console.error('Error fetching blog analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-emerald-600">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 mb-10 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2 tracking-tight text-slate-900">Blog Analytics</h2>
          <p className="text-slate-500 text-lg">Performance trends of your published articles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-emerald-600 font-medium">Total Views</div>
              <div className="text-2xl font-bold text-emerald-700">{totalViews.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-indigo-600 font-medium">Total Clicks</div>
              <div className="text-2xl font-bold text-indigo-700">{totalClicks.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-800">Performance by Post (All Time)</h3>
        </div>
        
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>No blog posts found</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.slice(0, 10)} // Show top 10
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-lg">
                          <p className="font-medium text-slate-900 mb-2">{payload[0].payload.fullTitle}</p>
                          <div className="space-y-1">
                            <p className="text-emerald-600 font-semibold text-sm flex items-center justify-between">
                              <span>Views:</span> 
                              <span className="ml-4">{payload[0].payload.views.toLocaleString()}</span>
                            </p>
                            <p className="text-indigo-600 font-semibold text-sm flex items-center justify-between">
                              <span>Clicks:</span> 
                              <span className="ml-4">{payload[0].payload.clicks.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar name="Views" dataKey="views" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Clicks" dataKey="clicks" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">All Posts Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="px-6 py-4 font-medium">Post Title</th>
                <th className="px-6 py-4 font-medium text-right">Total Views</th>
                <th className="px-6 py-4 font-medium text-right">Total Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((blog, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{blog.fullTitle}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-sm font-semibold">
                      {blog.views.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-sm font-semibold">
                      {blog.clicks.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
