import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children, title, subtitle }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar />
      
      {/* Optional Page Header below Navbar */}
      <div className="flex-1 overflow-y-auto">
        {(title || subtitle) && (
          <div className="px-6 py-6 border-b border-slate-200 bg-white shadow-sm">
            {title && <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        )}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
