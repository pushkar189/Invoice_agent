// Format currency in Indian style (₹1,23,456)
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—';
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
};

export const getStatusColor = (status) => {
  const map = {
    PAID: 'badge-success',
    PENDING: 'badge-warning',
    OVERDUE: 'badge-danger',
    CANCELLED: 'badge-slate',
    REVIEW: 'badge-purple',
    FAILED: 'badge-danger',
    PROCESSING: 'badge-info',
  };
  return map[status] || 'badge-slate';
};

export const getValidationColor = (status) => {
  const map = {
    VALID: 'badge-success',
    WARNING: 'badge-warning',
    INVALID: 'badge-danger',
    REVIEW_REQUIRED: 'badge-purple',
  };
  return map[status] || 'badge-slate';
};

export const getFlagSeverityColor = (severity) => {
  const map = { LOW: 'badge-info', MEDIUM: 'badge-warning', HIGH: 'badge-danger', CRITICAL: 'badge-danger' };
  return map[severity] || 'badge-slate';
};

export const truncate = (str, max = 40) => {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '...' : str;
};

export const daysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  return Math.max(0, diff);
};
