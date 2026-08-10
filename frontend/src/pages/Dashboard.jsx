import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, Clock, AlertTriangle, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Layout from '../components/layout/Layout';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/format';
import { SkeletonCard, EmptyState, ErrorMessage } from '../components/common';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

const KPICard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="stat-card animate-slide-up">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, st, r] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.monthly(),
          dashboardApi.status(),
          dashboardApi.recent(),
        ]);
        setStats(s.data.data);
        setMonthly(m.data.data);
        setStatusData(st.data.data);
        setRecent(r.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const kpis = stats ? [
    { title: 'Total Invoices', value: stats.total_invoices, icon: FileText, color: 'bg-primary-600', sub: 'All time' },
    { title: 'Total Amount', value: formatCurrency(stats.total_amount), icon: TrendingUp, color: 'bg-emerald-600', sub: 'All invoices' },
    { title: 'Paid', value: formatCurrency(stats.paid_amount), icon: CheckCircle2, color: 'bg-teal-600', sub: `${stats.paid_count} invoices` },
    { title: 'Pending', value: formatCurrency(stats.pending_amount), icon: Clock, color: 'bg-amber-600', sub: `${stats.pending_count} invoices` },
    { title: 'Overdue', value: formatCurrency(stats.overdue_amount), icon: XCircle, color: 'bg-red-600', sub: `${stats.overdue_count} invoices` },
    { title: 'Review Required', value: stats.review_count, icon: AlertTriangle, color: 'bg-purple-600', sub: 'Needs attention' },
  ] : [];

  const chartData = monthly.map(m => ({
    month: m.month,
    Total: parseFloat(m.total) || 0,
    Paid: parseFloat(m.paid) || 0,
    Pending: parseFloat(m.pending) || 0,
  }));

  const pieData = statusData.map(s => ({
    name: s.status,
    value: parseInt(s.count),
  }));

  if (loading) return (
    <Layout title="Dashboard" subtitle="AI Invoice Intelligence">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </Layout>
  );

  return (
    <Layout title="Dashboard" subtitle="Invoice intelligence overview">
      {error && <ErrorMessage message={error} />}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpis.map(k => <KPICard key={k.title} {...k} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6 animate-slide-up">
        {/* Monthly Chart */}
        <div className="xl:col-span-2 card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Invoice Amount</h3>
          {chartData.length === 0 ? (
            <EmptyState icon={BarChart} title="No monthly data yet" message="Upload invoices to see monthly trends" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#0f172a' }}
                  formatter={v => formatCurrency(v)}
                />
                <Bar dataKey="Total" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Paid" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Pie */}
        <div className="card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Invoice Status</h3>
          {pieData.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {/* Recent Invoices */}
        <div className="card overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Invoices</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all →</button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" message="Upload your first invoice" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map(inv => (
                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors">{inv.invoice_number || 'No Number'}</p>
                    <p className="text-xs text-slate-500 truncate">{inv.vendor || 'Unknown vendor'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(inv.total)}</p>
                    <span className={`text-xs ${getStatusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
