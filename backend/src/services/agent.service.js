import db from '../config/database.js';
import { generateNaturalLanguage } from './gemma.service.js';
import { logger } from '../utils/logger.js';

// ============================================================
// CONTROLLED TOOLS — No arbitrary SQL allowed
// ============================================================

const tools = {
  async searchInvoices({ query, status, minAmount, maxAmount, limit = 10 }) {
    const params = [];
    const conditions = [];

    if (query) {
      params.push(`%${query}%`);
      conditions.push(`(i.invoice_number ILIKE $${params.length} OR v.name ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status.toUpperCase());
      conditions.push(`i.status = $${params.length}`);
    }
    if (minAmount !== undefined) {
      params.push(minAmount);
      conditions.push(`i.total >= $${params.length}`);
    }
    if (maxAmount !== undefined) {
      params.push(maxAmount);
      conditions.push(`i.total <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const { rows } = await db.query(
      `SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.due_date,
              i.total, i.currency, i.status, i.validation_status
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       ${where}
       ORDER BY i.created_at DESC LIMIT $${params.length}`,
      params
    );
    return rows;
  },

  async getPendingInvoices({ limit = 20 }) {
    const { rows } = await db.query(
      `SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.due_date, i.total, i.currency
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE i.status = 'PENDING'
       ORDER BY i.due_date ASC NULLS LAST LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async getOverdueInvoices({ limit = 20 }) {
    const { rows } = await db.query(
      `SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.due_date, i.total, i.currency,
              (CURRENT_DATE - i.due_date::date) as days_overdue
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE i.status IN ('OVERDUE', 'PENDING') AND i.due_date IS NOT NULL AND i.due_date::date < CURRENT_DATE
       ORDER BY i.due_date ASC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async getVendorSummary({ limit = 10 }) {
    const { rows } = await db.query(
      `SELECT v.id, v.name, v.gstin,
              COUNT(i.id) as invoice_count,
              SUM(i.total) as total_spent,
              SUM(CASE WHEN i.status = 'PENDING' THEN i.total ELSE 0 END) as pending_amount,
              SUM(CASE WHEN i.status = 'PAID' THEN i.total ELSE 0 END) as paid_amount
       FROM vendors v
       LEFT JOIN invoices i ON v.id = i.vendor_id
       GROUP BY v.id, v.name, v.gstin
       ORDER BY total_spent DESC NULLS LAST LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async getMonthlyExpenses({ year, month }) {
    let query;
    let params;

    if (year && month) {
      query = `
        SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') as month,
               COUNT(*) as count, SUM(total) as total, AVG(total) as avg_amount
        FROM invoices
        WHERE EXTRACT(YEAR FROM invoice_date::date) = $1
          AND EXTRACT(MONTH FROM invoice_date::date) = $2
        GROUP BY 1 ORDER BY 1`;
      params = [year, month];
    } else if (year) {
      query = `
        SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') as month,
               COUNT(*) as count, SUM(total) as total, AVG(total) as avg_amount
        FROM invoices
        WHERE EXTRACT(YEAR FROM invoice_date::date) = $1
          AND invoice_date IS NOT NULL
        GROUP BY 1 ORDER BY 1`;
      params = [year];
    } else {
      query = `
        SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') as month,
               COUNT(*) as count, SUM(total) as total, AVG(total) as avg_amount
        FROM invoices
        WHERE invoice_date IS NOT NULL
          AND invoice_date::date >= NOW() - INTERVAL '12 months'
        GROUP BY 1 ORDER BY 1`;
      params = [];
    }

    const { rows } = await db.query(query, params);
    return rows;
  },

  async getTaxSummary({ year, month }) {
    const params = [];
    const conditions = ['invoice_date IS NOT NULL'];

    if (year) { params.push(year); conditions.push(`EXTRACT(YEAR FROM invoice_date::date) = $${params.length}`); }
    if (month) { params.push(month); conditions.push(`EXTRACT(MONTH FROM invoice_date::date) = $${params.length}`); }

    const where = conditions.join(' AND ');
    const { rows } = await db.query(
      `SELECT SUM(cgst) as total_cgst, SUM(sgst) as total_sgst, SUM(igst) as total_igst,
              SUM(cgst + sgst + igst) as total_tax, COUNT(*) as invoice_count
       FROM invoices WHERE ${where}`,
      params
    );
    return rows[0];
  },

  async getInvoicesAboveAmount({ amount, limit = 20 }) {
    const { rows } = await db.query(
      `SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.total, i.currency, i.status
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE i.total >= $1
       ORDER BY i.total DESC LIMIT $2`,
      [amount, limit]
    );
    return rows;
  },

  async getInvoicesRequiringReview({ limit = 20 }) {
    const { rows } = await db.query(
      `SELECT i.id, i.invoice_number, v.name as vendor, i.invoice_date, i.total, i.status, i.validation_status,
              (SELECT COUNT(*) FROM invoice_flags f WHERE f.invoice_id = i.id AND f.resolved = false) as flag_count
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE i.status = 'REVIEW' OR i.validation_status IN ('REVIEW_REQUIRED', 'WARNING', 'INVALID')
       ORDER BY i.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async detectDuplicateInvoices() {
    const { rows } = await db.query(
      `SELECT f.invoice_id, i.invoice_number, v.name as vendor, i.total, f.message, f.created_at
       FROM invoice_flags f
       JOIN invoices i ON f.invoice_id = i.id
       LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE f.type = 'DUPLICATE' AND f.resolved = false
       ORDER BY f.created_at DESC`
    );
    return rows;
  },

  async getInvoiceStats() {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
         COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
         COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count,
         COUNT(CASE WHEN status = 'REVIEW' THEN 1 END) as review_count,
         SUM(total) as total_amount,
         SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END) as paid_amount,
         SUM(CASE WHEN status = 'PENDING' THEN total ELSE 0 END) as pending_amount,
         SUM(CASE WHEN status = 'OVERDUE' THEN total ELSE 0 END) as overdue_amount
       FROM invoices`
    );
    return rows[0];
  },
};

// ============================================================
// Intent detection — determine which tool(s) to use
// ============================================================

const detectIntent = (message) => {
  const lower = message.toLowerCase();

  if (lower.includes('overdue')) return { tool: 'getOverdueInvoices', args: {} };
  if (lower.includes('pending')) return { tool: 'getPendingInvoices', args: {} };
  if (lower.includes('duplicate')) return { tool: 'detectDuplicateInvoices', args: {} };
  if (lower.includes('review') || lower.includes('flag')) return { tool: 'getInvoicesRequiringReview', args: {} };

  // Amount threshold
  const amountMatch = lower.match(/(?:above|over|greater than|more than)\s+[₹rs\s]*([0-9,]+)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    return { tool: 'getInvoicesAboveAmount', args: { amount } };
  }

  // Vendor analysis
  if (lower.includes('vendor') || lower.includes('supplier')) {
    return { tool: 'getVendorSummary', args: {} };
  }

  // Tax queries
  if (lower.includes('gst') || lower.includes('tax')) {
    // Extract month/year if mentioned
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthMatch = monthNames.findIndex(m => lower.includes(m));
    return {
      tool: 'getTaxSummary',
      args: {
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        month: monthMatch >= 0 ? monthMatch + 1 : null,
      },
    };
  }

  // Monthly spending
  if (lower.includes('month') || lower.includes('spend') || lower.includes('expense') || lower.includes('july') || lower.includes('june')) {
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthMatch = monthNames.findIndex(m => lower.includes(m));
    return {
      tool: 'getMonthlyExpenses',
      args: {
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        month: monthMatch >= 0 ? monthMatch + 1 : null,
      },
    };
  }

  // Invoice search
  const invoiceNumMatch = lower.match(/inv[-_]?\d+/i);
  if (invoiceNumMatch) {
    return { tool: 'searchInvoices', args: { query: invoiceNumMatch[0] } };
  }

  // Stats / general
  if (lower.includes('how many') || lower.includes('total') || lower.includes('summary') || lower.includes('stats')) {
    return { tool: 'getInvoiceStats', args: {} };
  }

  // Default to stats
  return { tool: 'getInvoiceStats', args: {} };
};

/**
 * Process a user question through the agent pipeline:
 * question → intent → tool → DB → Gemma → response
 */
export const processAgentMessage = async (message, userId) => {
  logger.info(`Agent processing message from user ${userId}: "${message.slice(0, 100)}"`);

  const { tool, args } = detectIntent(message);
  logger.info(`Agent selected tool: ${tool} with args: ${JSON.stringify(args)}`);

  let toolResults;
  try {
    toolResults = await tools[tool](args);
  } catch (err) {
    logger.error(`Agent tool ${tool} failed: ${err.message}`);
    toolResults = { error: err.message };
  }

  const systemContext = `
This is an invoice management system for Indian businesses.
All amounts are in INR (Indian Rupees).
Tool used: ${tool}
Query parameters: ${JSON.stringify(args)}
  `.trim();

  const naturalLanguageResponse = await generateNaturalLanguage(systemContext, message, toolResults);

  return {
    response: naturalLanguageResponse,
    tool,
    toolResults,
    timestamp: new Date().toISOString(),
  };
};

export default { processAgentMessage };
