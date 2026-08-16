const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  debug(message, ...args) {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },
  info(message, ...args) {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

export default logger;
export { logger };
