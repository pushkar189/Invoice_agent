import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { db } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { ensureDir } from './utils/file.js';
import { checkOllamaHealth } from './services/ollama.service.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import agentRoutes from './routes/agent.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests', errorCode: 'RATE_LIMITED' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many upload requests', errorCode: 'RATE_LIMITED' },
});

app.use('/api/', apiLimiter);
app.use('/api/invoices/upload', uploadLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ────────────────────────────────────────────────────────
if (!config.isProduction) {
  app.use(morgan('dev'));
}

// ─── Static File Serving (for invoice previews) ─────────────────────────────
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await db.testConnection();
    dbStatus = 'connected';
  } catch {}

  const ollamaStatus = await checkOllamaHealth();

  const status = dbStatus === 'connected' && ollamaStatus.available ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    database: dbStatus,
    ollama: ollamaStatus.available ? 'available' : 'unavailable',
    model: config.ollama.modelName,
    modelLoaded: ollamaStatus.modelLoaded,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agent', agentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found`, errorCode: 'NOT_FOUND' });
});

// ─── Centralized Error Handler ───────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start Server ────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Ensure upload directory exists
    await ensureDir(path.resolve(config.upload.dir));
    logger.info(`Upload directory ready: ${path.resolve(config.upload.dir)}`);

    // Test DB connection
    await db.testConnection();

    // Check Ollama (non-fatal)
    const ollamaHealth = await checkOllamaHealth();
    if (!ollamaHealth.available) {
      logger.warn('⚠️  Ollama is not available. Invoice processing will fail until Ollama is started.');
    } else if (!ollamaHealth.modelLoaded) {
      logger.warn(`⚠️  Model ${config.ollama.modelName} not found. Run: ollama pull ${config.ollama.modelName}`);
    } else {
      logger.info(`✅ Ollama ready with model: ${config.ollama.modelName}`);
    }

    app.listen(config.port, () => {
      logger.info(`🚀 AI Invoice Agent Backend running on http://localhost:${config.port}`);
      logger.info(`📋 Environment: ${config.nodeEnv}`);
      logger.info(`🤖 AI Model: ${config.ollama.modelName} @ ${config.ollama.url}`);
    });
  } catch (err) {
    logger.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
