import { z } from 'zod';

const InvoiceItemSchema = z.object({
  description: z.string().default(''),
  quantity: z.number().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
});

const VendorSchema = z.object({
  name: z.string().default(''),
  gstin: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});

const CustomerSchema = z.object({
  name: z.string().default(''),
  gstin: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
});

const FinancialsSchema = z.object({
  subtotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  cgst: z.number().nonnegative().default(0),
  sgst: z.number().nonnegative().default(0),
  igst: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
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
