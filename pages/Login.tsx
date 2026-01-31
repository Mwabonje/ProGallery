import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, PlayCircle } from 'lucide-react';
import { supabase, isDemoMode } from '../services/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isDemoMode) {
        // Allow "fake" login in demo mode even if form is submitted
         localStorage.setItem('demo_user', 'true');
         window.location.reload(); // Reload to trigger App.tsx session check
         return;
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: 'photographer' }
          }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('demo_user', 'true');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <Camera className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ProGallery</h1>
            <p className="text-slate-500">Photographer Portal</p>
        </div>

        {isDemoMode && (
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
            <h3 className="text-blue-800 font-semibold text-sm mb-1">Demo Mode Active</h3>
            <p className="text-blue-600 text-xs mb-3">No backend configured. Try the interface with mock data.</p>
            <button
              onClick={handleDemoLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Enter Demo Dashboard</span>
            </button>
          </div>
        )}

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or sign in with email</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              required={!isDemoMode}
              placeholder={isDemoMode ? "Disabled in demo mode" : "you@example.com"}
              disabled={isDemoMode}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              required={!isDemoMode}
              disabled={isDemoMode}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isDemoMode}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isDemoMode}
            className="text-sm text-slate-600 hover:text-emerald-600 font-medium disabled:opacity-50"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};