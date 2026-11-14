// routes/health.js
// Health check JSON endpoint and diagnostic information

const express = require('express');
const router = express.Router();
const os = require('os');

const dbSql = require('../config/db-sql');
const dbMongo = require('../config/db-mongo');
const { checkThirdPartyHealth, TIMEOUT_MS } = require('../services/thirdPartyService');
const { getRecentLogs } = require('../config/logger');

const startTime = Date.now();

router.get('/health', async (req, res) => {
  const sqlHealth = await dbSql.checkSQLHealth();
  const mongoHealth = dbMongo.checkMongoHealth();
  const thirdPartyHealth = await checkThirdPartyHealth();

  const memUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const isOverallHealthy = sqlHealth.status === 'UP';

  const healthPayload = {
    status: isOverallHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    uptimeSeconds,
    environment: process.env.NODE_ENV || 'production',
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      cpuArchitecture: os.arch(),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      processMemoryUsageMB: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024)
      }
    },
    databases: {
      sql: {
        engine: 'SQLite3 (SQL)',
        storage: 'Persistent File',
        ...sqlHealth
      },
      mongoDb: {
        ...mongoHealth
      }
    },
    thirdPartyApi: {
      name: 'Apple iTunes Tamil Cinema Engine',
      configuredTimeoutMs: TIMEOUT_MS,
      ...thirdPartyHealth
    },
    features: {
      aiAssistant: 'Active (NLP Matcher + Escalation Engine + Gemini API Support)',
      errorCodesCatalogCount: 8,
      ticketStorage: 'SQL Database (support_tickets)',
      chatLogStorage: 'MongoDB / Fallback Store (chat_logs)',
      feedbackStorage: 'MongoDB / Fallback Store (feedback)'
    }
  };

  res.status(isOverallHealthy ? 200 : 503).json(healthPayload);
});

// Logs endpoint for live dashboard
router.get('/logs', (req, res) => {
  res.json({
    total: getRecentLogs().length,
    logs: getRecentLogs()
  });
});

module.exports = router;

