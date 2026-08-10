# AI Invoice Processing & Intelligence Agent

A complete AI-powered invoice processing system that uses **Gemma 4 via Ollama** to extract structured data from PDF/image invoices, validate financials independently, detect duplicates and anomalies, and provide a natural-language AI assistant for business intelligence queries.

## Features

- 🎨 **Modern Animated UI** — A custom-built, premium light-mode interface with smooth micro-interactions and animations.
- 📄 **AI Invoice Extraction** — Gemma 4 extracts structured data from PDF/image invoices
- 🔍 **OCR Support** — Tesseract.js handles scanned/image invoices (pure JS, no Python)
- ✅ **Independent Financial Validation** — Backend recalculates all totals (never trusts AI math)
- 🚨 **Duplicate Detection** — Multi-field comparison flags potential duplicates
- 🧠 **Anomaly Detection** — Rule-based checks flag suspicious invoices
- 💬 **AI Assistant** — Natural language Q&A using controlled database tools (no arbitrary SQL)
- 📊 **Intelligent Dashboard** — Real-time KPIs, monthly trends, and recent invoice tracking
- 🔐 **Authentication** — Secure JWT-based login and registration (single user mode, no complex roles)
- 🐳 **Docker Ready** — Full Docker Compose deployment

## Architecture

```
React Dashboard (Vite + Tailwind)
       ↓ HTTP / Axios
Express Backend (Node.js)
       ↓
  ┌────┼────────────────┐
  ↓    ↓                ↓
NeonDB  PDF/OCR        AI Agent
(PG)   Processor       (tools)
           ↓               ↓
        Ollama          NeonDB
       gemma4:12b
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts + Lucide Icons |
| Backend | Node.js + Express.js (ES Modules) |
| Database | PostgreSQL via NeonDB (cloud) |
| AI | Gemma 4 12B via Ollama |
| OCR | Tesseract.js (pure JS) |
| Auth | JWT + bcrypt |
| Container | Docker + Docker Compose |

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+
- Ollama installed and running
- NeonDB account (or local PostgreSQL)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo>
cd Invoice_agent

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Set Up Environment

```bash
# backend/.env is already configured with NeonDB
# Verify MODEL_NAME matches your Ollama model
ollama list
```

### 3. Run Database Migration + Seed

```bash
cd backend
node scripts/migrate.js    # Creates all tables
node scripts/seed.js       # Adds sample invoices (dev only)
```

### 4. Start Ollama

```bash
ollama serve               # Starts Ollama server
# Verify model is loaded:
ollama list                # Should show gemma4:12b
```

### 5. Start Backend

```bash
cd backend
npm start                  # Production
# OR
npm run dev                # Development with auto-reload
```

Backend starts at: http://localhost:5000

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend starts at: http://localhost:5173

### 7. Verify Everything Works

```bash
curl http://localhost:5000/health
# Expected: {"status":"ok","database":"connected","ollama":"available","model":"gemma4:12b"...}
```

## API Endpoints

### Auth
```
POST /api/auth/register    — Register user
POST /api/auth/login       — Login
GET  /api/auth/me          — Get current user
```

### Invoices
```
POST /api/invoices/upload          — Upload & process invoice (AI extraction)
GET  /api/invoices                 — List invoices (search, filter, paginate)
GET  /api/invoices/:id             — Get invoice details
PUT  /api/invoices/:id             — Update invoice status
DELETE /api/invoices/:id           — Delete invoice
GET  /api/invoices/:id/download    — Download original file
GET  /api/invoices/:id/flags       — Get invoice flags
PUT  /api/invoices/:id/flags/:fid  — Resolve a flag
```

### Dashboard
```
GET /api/dashboard/stats    — KPI totals
GET /api/dashboard/monthly  — Monthly chart data
GET /api/dashboard/status   — Status breakdown
GET /api/dashboard/recent   — Recent invoices
```

### AI Agent
```
POST /api/agent/chat   — Natural language invoice Q&A
```

### System
```
GET /health   — System health check
```

## Invoice Processing Pipeline

```
Upload File
    ↓
File Validation (MIME + extension + size)
    ↓
Store File (safe UUID filename)
    ↓
Extract Text (pdf-parse for text PDFs)
    ↓
OCR if needed (tesseract.js for images/scanned PDFs)
    ↓
Gemma AI Extraction (structured JSON)
    ↓
Zod Schema Validation
    ↓
Independent Financial Recalculation
    ↓
Duplicate Detection (invoice # + vendor match)
    ↓
Anomaly Detection
    ↓
PostgreSQL Persistence (invoice + items + flags + validation)
    ↓
Response with confidence score + flags
```

## AI Agent Tools

The AI assistant uses **controlled database tools** only — no arbitrary SQL:

| Tool | Description |
|------|-------------|
| `searchInvoices` | Search by query/status/amount |
| `getPendingInvoices` | All pending invoices |
| `getOverdueInvoices` | Overdue invoices with days count |
| `getMonthlyExpenses` | Monthly expense trends |
| `getTaxSummary` | GST breakdown (CGST/SGST/IGST) |
| `getInvoicesAboveAmount` | Filter by minimum amount |
| `getInvoicesRequiringReview` | Review queue |
| `detectDuplicateInvoices` | Flagged duplicate invoices |
| `getInvoiceStats` | Overall statistics |

## Database Schema

Core tables: `users`, `invoices`, `invoice_items`, `payments`, `ai_extractions`, `invoice_validations`, `invoice_flags`

## Environment Variables

See `.env.example` for all variables. Key ones:

```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
OLLAMA_URL=http://localhost:11434
MODEL_NAME=gemma4:12b
JWT_SECRET=<strong-secret-32-chars>
```

## Troubleshooting

**Backend won't connect to NeonDB:**
→ Ensure `DATABASE_URL` includes `?sslmode=require&channel_binding=require`

**Ollama not available:**
→ Run `ollama serve` in a separate terminal
→ Verify with `curl http://localhost:11434/api/tags`

**Model not found:**
→ Run `ollama pull gemma4:12b`

**Upload processing fails:**
→ Check Ollama is running (AI extraction requires it)
→ Verify upload directory is writable

**PowerShell npm issues:**
→ Use `cmd /c "npm ..."` instead of running npm directly in PowerShell
