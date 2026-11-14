// routes/api.js
// Express Router for FAQs, Support Tickets, Error Codes, Tracks, Third-Party API, and Feedback

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dbSql = require('../config/db-sql');
const dbMongo = require('../config/db-mongo');
const { fetchTrendingTamilMusic } = require('../services/thirdPartyService');
const { ERROR_CODES_CATALOG } = require('../services/aiService');

// Load Tamil tracks from JSON
const tracksDataPath = path.join(__dirname, '..', 'data', 'tamil-tracks.json');
let tracksCache = [];
try {
  tracksCache = JSON.parse(fs.readFileSync(tracksDataPath, 'utf8'));
} catch (e) {
  console.error('Failed to load tracks data:', e.message);
}

// 1. Get Tamil tracks with optional genre filter & search
router.get('/tracks', (req, res) => {
  const { genre, search } = req.query;
  let results = [...tracksCache];

  if (genre && genre !== 'All') {
    results = results.filter(t => t.genre.toLowerCase() === genre.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(t => 
      t.title.toLowerCase().includes(term) ||
      t.movie.toLowerCase().includes(term) ||
      t.artists.toLowerCase().includes(term) ||
      t.composer.toLowerCase().includes(term)
    );
  }

  res.json({
    total: results.length,
    tracks: results
  });
});

// 2. FAQs endpoints (Stored in SQL)
router.get('/faqs', async (req, res) => {
  try {
    const { category, search } = req.query;
    const faqs = await dbSql.getAllFAQs(category, search);
    res.json({ success: true, count: faqs.length, faqs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/faqs/:id', async (req, res) => {
  try {
    const faq = await dbSql.getFAQById(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }
    res.json({ success: true, faq });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/faqs/:id/helpful', async (req, res) => {
  try {
    const updated = await dbSql.incrementFAQHelpful(req.params.id);
    res.json({ success: true, faq: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Support Tickets endpoints (Stored in SQL)
router.post('/tickets', async (req, res) => {
  try {
    const { user_name, user_email, subject, description, category, priority } = req.body;
    
    if (!subject || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subject and description are required for support ticket generation.' 
      });
    }

    const ticket = await dbSql.createSupportTicket({
      user_name,
      user_email,
      subject,
      description,
      category,
      priority,
      source: 'User Web Form'
    });

    res.status(201).json({ success: true, message: 'Support ticket logged in SQL database', ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const tickets = await dbSql.getAllTickets();
    res.json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tickets/:number', async (req, res) => {
  try {
    const ticket = await dbSql.getTicketByNumber(req.params.number);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Error Codes Catalog & Live Simulation Endpoints (All 8 + site-specific)
router.get('/errors', (req, res) => {
  res.json({
    total: Object.keys(ERROR_CODES_CATALOG).length,
    catalog: ERROR_CODES_CATALOG
  });
});

// Live Error Simulator: Returns the real HTTP status code requested!
router.get('/errors/simulate/:code', (req, res) => {
  const code = req.params.code;
  const errorInfo = ERROR_CODES_CATALOG[code];

  if (!errorInfo) {
    return res.status(400).json({
      error: 'Unknown error code for simulation',
      supportedCodes: Object.keys(ERROR_CODES_CATALOG)
    });
  }

  const statusCode = parseInt(code, 10);
  res.status(statusCode).json({
    status: statusCode,
    error: errorInfo.name,
    category: errorInfo.category,
    kollywoodContext: errorInfo.kollywoodContext,
    troubleshooting: errorInfo.troubleshooting,
    timestamp: new Date().toISOString()
  });
});

// 5. Third-Party API with Timeout and Fallback
router.get('/third-party/trending', async (req, res) => {
  const simulateTimeout = req.query.simulateTimeout === 'true';
  const result = await fetchTrendingTamilMusic(simulateTimeout);
  res.json(result);
});

// 6. User Feedback (Stored in MongoDB)
router.post('/feedback', async (req, res) => {
  try {
    const { sessionId, rating, comment, category } = req.body;
    if (!rating) {
      return res.status(400).json({ success: false, error: 'Rating (1-5) is required' });
    }

    const saved = await dbMongo.saveFeedback({ sessionId, rating, comment, category });
    res.status(201).json({ success: true, message: 'Feedback stored in MongoDB', feedback: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await dbMongo.getAllFeedback();
    res.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Chat Logs (Stored in MongoDB)
router.get('/chat-logs', async (req, res) => {
  try {
    const logs = await dbMongo.getChatLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

