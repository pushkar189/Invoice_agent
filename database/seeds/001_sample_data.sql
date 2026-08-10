-- AI Invoice Agent — Sample Seed Data
-- DEVELOPMENT USE ONLY — clearly marked

-- ─── Sample Vendors (DEV SEED) ───────────────────────────────────────────────
INSERT INTO vendors (id, name, gstin, address, email, phone) VALUES
  ('11111111-0000-0000-0000-000000000001', 'TechCorp Solutions Pvt Ltd', '27AABCT1332L1ZT', '401, Tech Park, Andheri East, Mumbai 400093', 'billing@techcorp.in', '+91-22-6677-8899'),
  ('11111111-0000-0000-0000-000000000002', 'Office Supplies Express', '29AABCO1234A1Z5', '12, MG Road, Bengaluru 560001', 'accounts@officesupplies.in', '+91-80-4455-6677'),
  ('11111111-0000-0000-0000-000000000003', 'CloudHost India Pvt Ltd', '07AABCC2345B1Z8', 'Block A, Cyber City, Gurugram 122002', 'finance@cloudhost.in', '+91-124-3344-5566'),
  ('11111111-0000-0000-0000-000000000004', 'Furniture World', NULL, '78, Industrial Area, Pune 411019', 'billing@furnitureworld.in', '+91-20-2233-4455'),
  ('11111111-0000-0000-0000-000000000005', 'Digital Marketing Co', '19AABCD3456C1ZA', '5th Floor, Park Street, Kolkata 700016', 'invoice@digitalmarketing.in', '+91-33-2233-4455')
ON CONFLICT (name) DO NOTHING;

-- ─── Sample Customers (DEV SEED) ─────────────────────────────────────────────
INSERT INTO customers (id, name, gstin, address, email, phone) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Acme Corporation Pvt Ltd', '27AAAAA1234A1Z5', '1st Floor, Nariman Point, Mumbai 400021', 'accounts@acme.in', '+91-22-6655-4433')
ON CONFLICT (name) DO NOTHING;

-- ─── Sample Invoices (DEV SEED) ──────────────────────────────────────────────

-- 1. Normal invoice (PAID)
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000001',
  'INV-2025-001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-01', '2025-07-31',
  50000, 0, 4500, 4500, 0, 59000, 'INR',
  'PAID', 'techcorp_july_2025.pdf', 'COMPLETED', 'VALID'
);

-- 2. GST invoice (PENDING)
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000002',
  'INV-2025-002',
  '11111111-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-15', '2025-08-15',
  25000, 500, 2205, 2205, 0, 28910, 'INR',
  'PENDING', 'cloudhost_q2_2025.pdf', 'COMPLETED', 'VALID'
);

-- 3. Multiple-item invoice (PAID)
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000003',
  'INV-2025-003',
  '11111111-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000001',
  '2025-06-20', '2025-07-20',
  12500, 250, 1102.5, 1102.5, 0, 14455, 'INR',
  'PAID', 'office_supplies_june.pdf', 'COMPLETED', 'VALID'
);

-- 4. Invoice with missing GSTIN — vendor has null GSTIN
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000004',
  'INV-2025-004',
  '11111111-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-10', '2025-08-10',
  35000, 0, 0, 0, 0, 35000, 'INR',
  'REVIEW', 'furniture_world_jul.pdf', 'COMPLETED', 'WARNING'
);

-- 5. Invoice with total mismatch (REVIEW)
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000005',
  'INV-2025-005',
  '11111111-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-05', '2025-08-05',
  20000, 0, 1800, 1800, 0, 25000, 'INR',
  'REVIEW', 'digital_marketing_jul.pdf', 'COMPLETED', 'REVIEW_REQUIRED'
);

-- 6. Duplicate invoice (same number as INV-2025-001)
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000006',
  'INV-2025-001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-01', '2025-07-31',
  50000, 0, 4500, 4500, 0, 59000, 'INR',
  'REVIEW', 'techcorp_july_2025_duplicate.pdf', 'COMPLETED', 'REVIEW_REQUIRED'
);

-- 7. Overdue invoice
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000007',
  'INV-2025-007',
  '11111111-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000001',
  '2025-05-01', '2025-05-31',
  45000, 0, 4050, 4050, 0, 53100, 'INR',
  'OVERDUE', 'cloudhost_may_2025.pdf', 'COMPLETED', 'VALID'
);

-- 8. Large invoice anomaly
INSERT INTO invoices (id, invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, discount, cgst, sgst, igst, total, currency, status, original_file_name, extraction_status, validation_status)
VALUES (
  '33333333-0000-0000-0000-000000000008',
  'INV-2025-008',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '2025-07-20', '2025-08-20',
  1200000, 50000, 103500, 103500, 0, 1357000, 'INR',
  'REVIEW', 'techcorp_large_contract.pdf', 'COMPLETED', 'WARNING'
);

-- ─── Invoice Items ─────────────────────────────────────────────────────────────
-- Items for INV-2025-001
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate, tax_amount, discount, total) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Software Development Services - Phase 1', 1, 30000, 18, 5400, 0, 35400),
  ('33333333-0000-0000-0000-000000000001', 'Technical Consulting (20 hours @ ₹1000/hr)', 20, 1000, 18, 3600, 0, 23600);

-- Items for INV-2025-003
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate, tax_amount, discount, total) VALUES
  ('33333333-0000-0000-0000-000000000003', 'Printer Paper A4 (5 reams)', 5, 500, 18, 450, 0, 2950),
  ('33333333-0000-0000-0000-000000000003', 'Ballpoint Pens (Box of 50)', 2, 250, 18, 90, 0, 590),
  ('33333333-0000-0000-0000-000000000003', 'Laptop Stand Adjustable', 3, 1500, 18, 810, 250, 5060),
  ('33333333-0000-0000-0000-000000000003', 'Wireless Mouse Logitech', 5, 800, 18, 720, 0, 4720),
  ('33333333-0000-0000-0000-000000000003', 'USB Type-C Cable 2m', 10, 150, 18, 270, 0, 1770);

-- ─── Payments ─────────────────────────────────────────────────────────────────
INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference_number, status) VALUES
  ('33333333-0000-0000-0000-000000000001', '2025-07-28', 59000, 'NEFT', 'NEFT20250728001234', 'COMPLETED'),
  ('33333333-0000-0000-0000-000000000003', '2025-07-19', 14455, 'UPI', 'UPI20250719987654', 'COMPLETED');

-- ─── Invoice Flags ─────────────────────────────────────────────────────────────
INSERT INTO invoice_flags (invoice_id, type, severity, message, metadata) VALUES
  ('33333333-0000-0000-0000-000000000004', 'INVALID_GSTIN', 'LOW', 'Vendor GSTIN is missing from the invoice', '{"vendor": "Furniture World"}'),
  ('33333333-0000-0000-0000-000000000005', 'TOTAL_MISMATCH', 'HIGH', 'Calculated total (₹23600) does not match invoice total (₹25000)', '{"calculated": 23600, "reported": 25000, "difference": 1400}'),
  ('33333333-0000-0000-0000-000000000006', 'DUPLICATE', 'HIGH', 'Possible duplicate of existing invoice INV-2025-001', '{"duplicateId": "33333333-0000-0000-0000-000000000001"}'),
  ('33333333-0000-0000-0000-000000000008', 'ANOMALY', 'MEDIUM', 'Invoice total ₹1357000 exceeds ₹1000000 threshold', '{"total": 1357000, "threshold": 1000000}');

-- ─── AI Extractions (sample records) ─────────────────────────────────────────
INSERT INTO ai_extractions (invoice_id, model_name, confidence_score, processing_time_ms, structured_response) VALUES
  ('33333333-0000-0000-0000-000000000001', 'gemma4:12b', 0.92, 8500, '{"invoiceNumber":"INV-2025-001","confidence":"high"}'),
  ('33333333-0000-0000-0000-000000000002', 'gemma4:12b', 0.88, 9200, '{"invoiceNumber":"INV-2025-002","confidence":"high"}');

-- ─── Invoice Validations (sample records) ─────────────────────────────────────
INSERT INTO invoice_validations (invoice_id, calculated_subtotal, calculated_tax, calculated_total, invoice_total, difference, validation_status, validation_message) VALUES
  ('33333333-0000-0000-0000-000000000001', 50000, 9000, 59000, 59000, 0, 'VALID', 'Calculated totals match invoice totals'),
  ('33333333-0000-0000-0000-000000000005', 20000, 3600, 23600, 25000, 1400, 'INVALID', 'Total mismatch: calculated ₹23600 vs invoice ₹25000 (diff: ₹1400)');
