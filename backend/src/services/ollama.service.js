import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const ollamaClient = axios.create({
  baseURL: config.ollama.url,
  timeout: 600000, // 10 minutes for large model responses
});

/**
 * Check if Ollama is available and the configured model is loaded.
 */
export const checkOllamaHealth = async () => {
  try {
    const response = await ollamaClient.get('/api/tags');
    const models = response.data?.models || [];
    const modelAvailable = models.some(m => m.name === config.ollama.modelName);
    return {
      available: true,
      model: config.ollama.modelName,
      modelLoaded: modelAvailable,
      allModels: models.map(m => m.name),
    };
  } catch (err) {
    logger.warn(`Ollama health check failed: ${err.message}`);
    return { available: false, model: config.ollama.modelName, modelLoaded: false, error: err.message };
  }
};

/**
 * Send a prompt to Ollama and return the raw response text.
 */
export const generate = async (prompt, options = {}) => {
  const startTime = Date.now();
  try {
    logger.info(`Sending prompt to Ollama (model: ${config.ollama.modelName})...`);
    const response = await ollamaClient.post('/api/generate', {
      model: config.ollama.modelName,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.1,
        top_p: options.top_p ?? 0.9,
        num_predict: options.num_predict ?? 4096,
        ...options.modelOptions,
      },
    });

    const processingTime = Date.now() - startTime;
    logger.info(`Ollama response received in ${processingTime}ms`);

    return {
      text: response.data?.response || '',
      processingTimeMs: processingTime,
      model: response.data?.model || config.ollama.modelName,
      done: response.data?.done || false,
    };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    if (err.code === 'ECONNREFUSED') {
      throw Object.assign(new Error('Ollama is not running. Please start Ollama and try again.'), {
        errorCode: 'OLLAMA_UNAVAILABLE',
        statusCode: 503,
      });
    }
    if (err.response?.status === 404) {
      throw Object.assign(new Error(`Model ${config.ollama.modelName} not found. Run: ollama pull ${config.ollama.modelName}`), {
        errorCode: 'MODEL_NOT_FOUND',
        statusCode: 503,
      });
    }
    logger.error(`Ollama generate failed after ${processingTime}ms: ${err.message}`);
    throw err;
  }
};

export default { checkOllamaHealth, generate };
