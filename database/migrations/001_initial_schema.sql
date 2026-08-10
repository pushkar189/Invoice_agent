-- AI Invoice Processing & Intelligence Agent
-- Initial Schema Migration
-- Compatible with NeonDB (PostgreSQL)

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vendors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  gstin       VARCHAR(20),
  address     TEXT,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  gstin       VARCHAR(20),
  address     TEXT,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number      VARCHAR(100),
  vendor_id           UUID REFERENCES vendors(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_date        VARCHAR(20),
  due_date            VARCHAR(20),
  subtotal            NUMERIC(15, 2) DEFAULT 0,
  discount            NUMERIC(15, 2) DEFAULT 0,
  cgst                NUMERIC(15, 2) DEFAULT 0,
  sgst                NUMERIC(15, 2) DEFAULT 0,
  igst                NUMERIC(15, 2) DEFAULT 0,
  total               NUMERIC(15, 2) DEFAULT 0,
  currency            VARCHAR(10) DEFAULT 'INR',
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PAID', 'PENDING', 'OVERDUE', 'CANCELLED', 'REVIEW')),
  original_file_name  VARCHAR(500),
  stored_file_name    VARCHAR(500),
  file_path           TEXT,
  extraction_status   VARCHAR(20) DEFAULT 'UPLOADED'
                        CHECK (extraction_status IN ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  validation_status   VARCHAR(20) DEFAULT 'REVIEW_REQUIRED'
                        CHECK (validation_status IN ('VALID', 'WARNING', 'INVALID', 'REVIEW_REQUIRED')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity    NUMERIC(15, 4) DEFAULT 0,
  unit_price  NUMERIC(15, 2) DEFAULT 0,
  tax_rate    NUMERIC(8, 4) DEFAULT 0,
  tax_amount  NUMERIC(15, 2) DEFAULT 0,
  discount    NUMERIC(15, 2) DEFAULT 0,
  total       NUMERIC(15, 2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date      DATE,
  amount            NUMERIC(15, 2) NOT NULL,
  payment_method    VARCHAR(50),
  reference_number  VARCHAR(200),
  status            VARCHAR(20) DEFAULT 'COMPLETED',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Extractions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_extractions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  model_name          VARCHAR(100),
  raw_response        TEXT,
  structured_response JSONB,
  confidence_score    NUMERIC(5, 4) DEFAULT 0,
  processing_time_ms  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Validations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_validations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  calculated_subtotal NUMERIC(15, 2),
  calculated_tax      NUMERIC(15, 2),
  calculated_total    NUMERIC(15, 2),
  invoice_total       NUMERIC(15, 2),
  difference          NUMERIC(15, 2),
  validation_status   VARCHAR(20),
  validation_message  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Flags ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL
                CHECK (type IN ('DUPLICATE','TOTAL_MISMATCH','TAX_MISMATCH','MISSING_FIELD','LOW_CONFIDENCE','ANOMALY','INVALID_GSTIN')),
  severity    VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message     TEXT,
  metadata    JSONB DEFAULT '{}',
  resolved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_validation ON invoices(validation_status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_flags_invoice ON invoice_flags(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_flags_type ON invoice_flags(type);
CREATE INDEX IF NOT EXISTS idx_invoice_flags_resolved ON invoice_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_invoice ON ai_extractions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
