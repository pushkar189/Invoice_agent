import db from '../config/database.js';

export const getStats = async (req, res, next) => {
  try {
    const [mainStats, reviewCount] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as total_invoices,
          SUM(total) as total_amount,
          SUM(CASE WHEN status='PAID' THEN total ELSE 0 END) as paid_amount,
          SUM(CASE WHEN status='PENDING' THEN total ELSE 0 END) as pending_amount,
          SUM(CASE WHEN status='OVERDUE' THEN total ELSE 0 END) as overdue_amount,
          COUNT(CASE WHEN status='PAID' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status='PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status='OVERDUE' THEN 1 END) as overdue_count
        FROM invoices
      `),
      db.query(`
        SELECT COUNT(*) as review_count FROM invoices
        WHERE status = 'REVIEW' OR validation_status IN ('REVIEW_REQUIRED','WARNING','INVALID')
      `),
    ]);

    res.json({
      success: true,
      data: { ...mainStats.rows[0], review_count: reviewCount.rows[0].review_count },
    });
  } catch (err) {
    next(err);
  }
};

export const getMonthly = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(invoice_date::date, 'Mon YY') as month,
        TO_CHAR(invoice_date::date, 'YYYY-MM') as month_key,
        COUNT(*) as count,
        SUM(total) as total,
        SUM(CASE WHEN status='PAID' THEN total ELSE 0 END) as paid,
        SUM(CASE WHEN status='PENDING' THEN total ELSE 0 END) as pending
      FROM invoices
      WHERE invoice_date IS NOT NULL
        AND invoice_date::date >= NOW() - INTERVAL '12 months'
      GROUP BY 1, 2
      ORDER BY 2
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getVendors = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT v.name, SUM(i.total) as total_spent, COUNT(i.id) as invoice_count
      FROM vendors v JOIN invoices i ON v.id = i.vendor_id
      GROUP BY v.id, v.name
      ORDER BY total_spent DESC LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getStatusBreakdown = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT status, COUNT(*) as count, SUM(total) as total
      FROM invoices
      GROUP BY status
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getRecentInvoices = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.total, i.status, i.validation_status
      FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
      ORDER BY i.created_at DESC LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export default { getStats, getMonthly, getVendors, getStatusBreakdown, getRecentInvoices };
