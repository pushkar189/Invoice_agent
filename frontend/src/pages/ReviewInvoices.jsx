import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Flag } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { invoicesApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge, ValidationBadge, LoadingSpinner, EmptyState, ErrorMessage } from '../components/common';

const ReviewInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    invoicesApi.list({ status: 'REVIEW', limit: 50 })
      .then(res => setInvoices(res.data.data.invoices))
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Review Queue" subtitle="Invoices requiring manual review">
      {error && <ErrorMessage message={error} />}

      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 animate-slide-up">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          These invoices have been flagged for review due to validation issues, duplicates, anomalies, or low AI confidence.
          Please review and update their status accordingly.
        </p>
      </div>

      {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
        <EmptyState icon={Flag} title="No invoices in review" message="All invoices are validated. Great job!" />
      ) : (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {invoices.map(inv => (
            <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
              className="card p-4 hover:border-amber-300 cursor-pointer transition-all duration-300 flex items-center gap-4 group">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm group-hover:text-primary-600 transition-colors">{inv.invoice_number || 'No Number'}</span>
                  <StatusBadge status={inv.status} />
                  <ValidationBadge status={inv.validation_status} />
                </div>
                <p className="text-xs text-slate-500 truncate">{inv.vendor_name || 'Unknown Vendor'} • {formatDate(inv.invoice_date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900">{formatCurrency(inv.total)}</p>
                {inv.flag_count > 0 && <p className="text-xs text-red-600 mt-0.5 font-medium">⚑ {inv.flag_count} flags</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default ReviewInvoices;
