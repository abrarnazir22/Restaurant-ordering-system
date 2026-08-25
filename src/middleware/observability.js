const crypto = require('crypto');
const mongoose = require('mongoose');

// In-memory metrics counter for operational observability
const metrics = {
  startedAt: new Date(),
  totalRequests: 0,
  activeRequests: 0,
  requestsByMethod: {},
  responsesByStatus: {},
  errorsCount: 0,
  totalLatencyMs: 0
};

/**
 * Structured logger utility
 */
const logger = {
  info: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level: 'info', message: msg, ...meta }));
  },
  warn: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({ timestamp, level: 'warn', message: msg, ...meta }));
  },
  error: (msg, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(JSON.stringify({ timestamp, level: 'error', message: msg, ...meta }));
  }
};

/**
 * Middleware: assigns a unique Request ID (and accepts incoming x-correlation-id / x-request-id)
 * and logs request lifecycle with response time.
 */
function requestTracingMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();
  metrics.totalRequests += 1;
  metrics.activeRequests += 1;
  metrics.requestsByMethod[req.method] = (metrics.requestsByMethod[req.method] || 0) + 1;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
    metrics.responsesByStatus[res.statusCode] = (metrics.responsesByStatus[res.statusCode] || 0) + 1;
    metrics.totalLatencyMs += duration;

    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    if (res.statusCode >= 500) {
      metrics.errorsCount += 1;
      logger.error('Request failed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client request error', logData);
    } else {
      logger.info('Request processed', logData);
    }
  });

  next();
}

/**
 * Health check handler returning system and database status
 */
function healthCheckHandler(req, res) {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isHealthy = dbState === 1;
  const uptimeSeconds = Math.floor((Date.now() - metrics.startedAt.getTime()) / 1000);
  const avgLatencyMs = metrics.totalRequests > 0
    ? (metrics.totalLatencyMs / metrics.totalRequests).toFixed(2)
    : 0;

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      readyState: dbState
    },
    metrics: {
      totalRequests: metrics.totalRequests,
      activeRequests: metrics.activeRequests,
      errorsCount: metrics.errorsCount,
      avgLatencyMs: Number(avgLatencyMs),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
  };

  const statusCode = isHealthy ? 200 : 503;
  return res.status(statusCode).json(healthData);
}

module.exports = {
  logger,
  requestTracingMiddleware,
  healthCheckHandler,
  metrics
};
