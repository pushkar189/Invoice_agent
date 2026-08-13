import { z } from 'zod';

const safeNumber = z.preprocess(
  (val) => (val === null || val === undefined || val === '' || isNaN(Number(val))) ? 0 : Number(val),
  z.number().default(0)
);

const InvoiceItemSchema = z.object({
  description: z.string().nullable().transform(v => v || '').default(''),
  quantity: safeNumber,
  unitPrice: safeNumber,
  taxRate: safeNumber,
  taxAmount: safeNumber,
  discount: safeNumber,
  total: safeNumber,
});

const VendorSchema = z.object({
  name: z.string().nullable().default(null),
  gstin: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});

const CustomerSchema = z.object({
  name: z.string().nullable().default(null),
  gstin: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});

const FinancialsSchema = z.object({
  subtotal: safeNumber,
  discount: safeNumber,
  cgst: safeNumber,
  sgst: safeNumber,
  igst: safeNumber,
  total: safeNumber,
});

export const ExtractedInvoiceSchema = z.object({
  invoiceNumber: z.string().nullable().default(null),
  invoiceDate: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  vendor: VendorSchema.default({}),
  customer: CustomerSchema.default({}),
  items: z.array(InvoiceItemSchema).default([]),
  financials: FinancialsSchema.default({}),
  currency: z.string().default('INR'),
});

export const UpdateInvoiceSchema = z.object({
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED', 'REVIEW']).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export default { ExtractedInvoiceSchema, UpdateInvoiceSchema };
