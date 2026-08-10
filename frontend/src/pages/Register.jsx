import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { user, token } = res.data.data;
      login(user, token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Left Column: Image Cover */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
        <img 
          src="/images/auth-hero.png" 
          alt="Modern office desk with AI elements" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 animate-fade-in transform scale-x-[-1]"
        />
        <div className="absolute bottom-12 left-12 right-12 z-20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-3xl font-bold text-white mb-3">Join the Future of Finance</h2>
          <p className="text-slate-300 text-lg max-w-lg">
            Create an account to experience the power of AI-driven invoice processing and smart financial analytics.
          </p>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-slide-up">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg shadow-primary-500/20 mb-6 animate-float">
              <Zap size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create an account</h1>
            <p className="text-slate-500 mt-2">Get started with Invoice Agent today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in">{error}</div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input id="reg-name" type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="input py-2.5 text-base" placeholder="John Doe" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input id="reg-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="input py-2.5 text-base" placeholder="you@example.com" required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input id="reg-password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="input py-2.5 pr-10 text-base" placeholder="Min. 8 characters" minLength={8} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base shadow-lg shadow-primary-500/30 mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center lg:text-left text-sm text-slate-600 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Register;
