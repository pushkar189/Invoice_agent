const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const timestamp = () => new Date().toISOString();

const format = (level, message, ...args) => {
  const extra = args.length ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : '';
  return `[${timestamp()}] [${level.toUpperCase()}] ${message}${extra}`;
};

export const logger = {
  error: (message, ...args) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.error)
      console.error(format('error', message, ...args));
  },
  warn: (message, ...args) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.warn)
      console.warn(format('warn', message, ...args));
  },
  info: (message, ...args) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.info)
      console.log(format('info', message, ...args));
  },
  debug: (message, ...args) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.debug)
      console.log(format('debug', message, ...args));
  },
};

export default logger;
