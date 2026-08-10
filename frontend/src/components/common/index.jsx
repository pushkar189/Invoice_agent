import React from 'react';
import { getStatusColor, getValidationColor } from '../../utils/format';

export const StatusBadge = ({ status }) => (
  <span className={getStatusColor(status)}>
    {status}
  </span>
);

export const ValidationBadge = ({ status }) => (
  <span className={getValidationColor(status)}>
    {status?.replace('_', ' ')}
  </span>
);

export const FlagCount = ({ count }) => {
  if (!count || count == 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
      ⚑ {count}
    </span>
  );
};

export const LoadingSpinner = ({ size = 20 }) => (
  <div className="flex items-center justify-center p-8">
    <div
      className="border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  </div>
);

export const EmptyState = ({ icon: Icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
    {Icon && <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 shadow-sm animate-float">
      <Icon size={24} className="text-slate-400" />
    </div>}
    <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
    {message && <p className="text-xs text-slate-500 max-w-xs mb-4">{message}</p>}
    {action}
  </div>
);

export const ErrorMessage = ({ message }) => (
  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in shadow-sm">
    <span className="text-lg">⚠</span>
    <span>{message}</span>
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const SkeletonCard = () => (
  <div className="card p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg mx-4 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};
