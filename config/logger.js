// config/logger.js
// Custom request logging middleware with in-memory buffer for the /health dashboard

const recentLogs = [];
const MAX_LOGS = 100;

function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      clientIp: String(clientIp).replace('::ffff:', ''),
      userAgent: req.headers['user-agent'] || 'Unknown'
    };

    // Keep the most recent 100 logs in memory
    recentLogs.unshift(logEntry);
    if (recentLogs.length > MAX_LOGS) {
      recentLogs.pop();
    }

    // Console output with color-coded status
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms - ${logEntry.clientIp}`);
  });

  next();
}

function getRecentLogs() {
  return recentLogs;
}

module.exports = {
  requestLogger,
  getRecentLogs
};

