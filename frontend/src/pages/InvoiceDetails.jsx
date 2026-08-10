import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, CheckCircle, AlertTriangle, XCircle, Flag } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { invoicesApi } from '../services/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getValidationColor, getFlagSeverityColor } from '../utils/format';
import { LoadingSpinner, ErrorMessage, StatusBadge, ValidationBadge, Modal } from '../components/common';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm text-slate-900 text-right max-w-xs break-words font-medium">{value || '—'}</span>
  </div>
);

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      const res = await invoicesApi.get(id);
      setInvoice(res.data.data);
      setNewStatus(res.data.data.status);
    } catch (err) {
      setError(err.response?.data?.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await invoicesApi.update(id, { status: newStatus });
      await load();
      setStatusModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleResolveFlag = async (flagId) => {
    try {
      await invoicesApi.resolveFlag(id, flagId);
      await load();
    } catch {}
  };

  if (loading) return <Layout title="Invoice Details"><LoadingSpinner /></Layout>;
  if (error) return <Layout title="Invoice Details"><ErrorMessage message={error} /></Layout>;
  if (!invoice) return null;

  return (
    <Layout title={`Invoice ${invoice.invoice_number || 'Details'}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 animate-slide-up">
        <button onClick={() => navigate(-1)} className="btn-ghost px-2 py-2">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{invoice.invoice_number || 'No Number'}</h2>
          <p className="text-sm text-slate-500">{invoice.vendor_name || 'Unknown Vendor'}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={invoice.status} />
          <ValidationBadge status={invoice.validation_status} />
        </div>
        <button onClick={() => setStatusModal(true)} className="btn-secondary text-sm">Update Status</button>
        <a href={invoicesApi.downloadUrl(id)} className="btn-secondary text-sm" download>
          <Download size={14} /> Download
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice Details */}
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Invoice Information</h3>
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="Invoice Number" value={invoice.invoice_number} />
                <InfoRow label="Invoice Date" value={formatDate(invoice.invoice_date)} />
                <InfoRow label="Due Date" value={formatDate(invoice.due_date)} />
                <InfoRow label="Currency" value={invoice.currency} />
              </div>
              <div>
                <InfoRow label="Status" value={<StatusBadge status={invoice.status} />} />
                <InfoRow label="Validation" value={<ValidationBadge status={invoice.validation_status} />} />
                <InfoRow label="Extraction" value={invoice.extraction_status} />
                <InfoRow label="Uploaded" value={formatDateTime(invoice.created_at)} />
              </div>
            </div>
          </div>

          {/* Vendor & Customer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Vendor</h4>
              <InfoRow label="Name" value={invoice.vendor_name} />
              <InfoRow label="GSTIN" value={invoice.vendor_gstin} />
              <InfoRow label="Email" value={invoice.vendor_email} />
              <InfoRow label="Phone" value={invoice.vendor_phone} />
            </div>
            <div className="card p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Customer</h4>
              <InfoRow label="Name" value={invoice.customer_name} />
              <InfoRow label="GSTIN" value={invoice.customer_gstin} />
              <InfoRow label="Email" value={invoice.customer_email} />
              <InfoRow label="Phone" value={invoice.customer_phone} />
            </div>
          </div>

          {/* Line Items */}
          {invoice.items?.length > 0 && (
            <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-800">Line Items ({invoice.items.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="text-left px-4 py-2">Description</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Unit Price</th>
                    <th className="text-right px-4 py-2">Tax %</th>
                    <th className="text-right px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-slate-900">{item.description}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{item.tax_rate}%</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Flags */}
          {invoice.flags?.length > 0 && (
            <div className="card p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                <Flag size={14} className="inline mr-2 text-red-500" />Flags ({invoice.flags.filter(f => !f.resolved).length} unresolved)
              </h3>
              <div className="space-y-2">
                {invoice.flags.map(flag => (
                  <div key={flag.id} className={`flex items-start justify-between p-3 rounded-lg border transition-all ${flag.resolved ? 'opacity-50 bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={getFlagSeverityColor(flag.severity)}>{flag.severity}</span>
                        <span className="text-xs text-slate-500">{flag.type}</span>
                        {flag.resolved && <span className="text-xs text-emerald-600">✓ Resolved</span>}
                      </div>
                      <p className="text-xs text-slate-800">{flag.message}</p>
                    </div>
                    {!flag.resolved && (
                      <button onClick={() => handleResolveFlag(flag.id)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-3 shrink-0">
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {/* Financials */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Financials</h3>
            <InfoRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
            <InfoRow label="Discount" value={formatCurrency(invoice.discount)} />
            <InfoRow label="CGST" value={formatCurrency(invoice.cgst)} />
            <InfoRow label="SGST" value={formatCurrency(invoice.sgst)} />
            <InfoRow label="IGST" value={formatCurrency(invoice.igst)} />
            <div className="flex justify-between pt-3 mt-2 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Total</span>
              <span className="text-lg font-bold text-primary-600">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {/* Validation Result */}
          {invoice.validation && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Validation Result</h3>
              <div className={`text-xs p-2 rounded mb-3 ${invoice.validation.validation_status === 'VALID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {invoice.validation.validation_message}
              </div>
              <InfoRow label="Calculated Total" value={formatCurrency(invoice.validation.calculated_total)} />
              <InfoRow label="Invoice Total" value={formatCurrency(invoice.validation.invoice_total)} />
              <InfoRow label="Difference" value={formatCurrency(invoice.validation.difference)} />
            </div>
          )}

          {/* AI Extraction Info */}
          {invoice.extraction && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">AI Extraction</h3>
              <InfoRow label="Model" value={invoice.extraction.model_name} />
              <InfoRow label="Confidence" value={`${(parseFloat(invoice.extraction.confidence_score) * 100).toFixed(1)}%`} />
              <InfoRow label="Processing Time" value={`${invoice.extraction.processing_time_ms}ms`} />
            </div>
          )}

          {/* Payments */}
          {invoice.payments?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Payments</h3>
              {invoice.payments.map(p => (
                <div key={p.id} className="text-xs space-y-1 p-2 bg-slate-50 rounded mb-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{formatDate(p.payment_date)}</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                  </div>
                  <p className="text-slate-500">{p.payment_method} • {p.reference_number || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* File Info */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Original File</h3>
            <InfoRow label="Filename" value={invoice.original_file_name} />
            <a href={invoicesApi.downloadUrl(id)} className="btn-secondary w-full justify-center mt-3 text-sm" download>
              <Download size={14} /> Download File
            </a>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Invoice Status">
        <div className="space-y-4">
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REVIEW">Review</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleStatusUpdate} disabled={updating} className="btn-primary flex-1 justify-center">
              {updating ? 'Updating...' : 'Update Status'}
            </button>
            <button onClick={() => setStatusModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default InvoiceDetails;
