// routes/ai.js
// Express Router for AI assistant interactions

const express = require('express');
const router = express.Router();
const { processAssistantQuery } = require('../services/aiService');
const dbMongo = require('../config/db-mongo');

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'web-session-' + Date.now() } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // Log the incoming user message to MongoDB
    await dbMongo.logChatMessage({
      sessionId,
      role: 'user',
      message: message.trim()
    });

    // Process through the AI Assistant engine
    const aiResponse = await processAssistantQuery(message.trim(), sessionId);

    res.json({
      success: true,
      sessionId,
      ...aiResponse
    });
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI chat response',
      details: error.message
    });
  }
});

module.exports = router;

