import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Upload, AlertTriangle, Bot, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/review', icon: AlertTriangle, label: 'Review Queue' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-md shadow-primary-500/20">
          <FileText size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 hidden md:block">
          InvoiceAI
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex items-center justify-center gap-1 md:gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ease-out
              ${isActive 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:scale-105'
              }`
            }
            title={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-sm font-medium hidden lg:block">{item.label}</span>
                
                {/* Active Indicator Underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.3)] animate-fade-in" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User Profile & Actions */}
      <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-full flex items-center justify-center text-slate-700 text-xs font-semibold shadow-inner">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{user?.name || 'User'}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-105" 
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

    </nav>
  );
};

export default Navbar;
