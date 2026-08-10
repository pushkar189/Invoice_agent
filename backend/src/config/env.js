import 'dotenv/config';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  database: {
    url: process.env.DATABASE_URL,
  },

  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    modelName: process.env.MODEL_NAME || 'gemma4:12b',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  validation: {
    financialTolerance: parseFloat(process.env.FINANCIAL_TOLERANCE || '0.01'),
  },
};
