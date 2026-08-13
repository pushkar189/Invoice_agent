import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { invoicesApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge, ValidationBadge, FlagCount, LoadingSpinner, EmptyState, ErrorMessage } from '../components/common';

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoicesApi.list({ search, status, page, limit: 20 });
      const { invoices: data, total: t, pages: p } = res.data.data;
      setInvoices(data);
      setTotal(t);
      setPages(p);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <Layout title="Invoices" subtitle={`${total} total invoices`}>
      {error && <ErrorMessage message={error} />}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="invoice-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice # or vendor..." className="input pl-8 text-sm" />
          </div>
          <button type="submit" className="btn-secondary text-sm px-3">Search</button>
        </form>
        <select id="status-filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input w-40 text-sm">
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
          <option value="REVIEW">Review</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button onClick={() => navigate('/upload')} className="btn-primary text-sm">+ Upload Invoice</button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header">Invoice #</th>
              <th className="table-header">Vendor</th>
              <th className="table-header">Date</th>
              <th className="table-header">Due Date</th>
              <th className="table-header text-right">Amount</th>
              <th className="table-header">Status</th>
              <th className="table-header">Validation</th>
              <th className="table-header">Flags</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><LoadingSpinner /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState icon={FileText} title="No invoices found"
                  message={search || status ? 'Try adjusting your filters' : 'Upload your first invoice to get started'}
                  action={<button onClick={() => navigate('/upload')} className="btn-primary text-sm mt-2">Upload Invoice</button>}
                />
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="table-row animate-fade-in" style={{ animationDelay: '0.1s' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td className="table-cell font-medium text-slate-900">{inv.invoice_number || '—'}</td>
                <td className="table-cell max-w-xs">
                  <p className="truncate text-slate-800">{inv.vendor_name || '—'}</p>
                  {inv.vendor_gstin && <p className="text-xs text-slate-500">{inv.vendor_gstin}</p>}
                </td>
                <td className="table-cell text-slate-600">{formatDate(inv.invoice_date)}</td>
                <td className="table-cell text-slate-600">{formatDate(inv.due_date)}</td>
                <td className="table-cell text-right font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                <td className="table-cell">
                  <StatusBadge status={['FAILED', 'PROCESSING'].includes(inv.extraction_status) ? inv.extraction_status : inv.status} />
                </td>
                <td className="table-cell">
                  {['FAILED', 'PROCESSING'].includes(inv.extraction_status) ? (
                    <span className="text-slate-400 text-xs">—</span>
                  ) : (
                    <ValidationBadge status={inv.validation_status} />
                  )}
                </td>
                <td className="table-cell">
                  {['FAILED', 'PROCESSING'].includes(inv.extraction_status) ? (
                    <span className="text-slate-400 text-xs">—</span>
                  ) : (
                    <FlagCount count={inv.flag_count} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices;
