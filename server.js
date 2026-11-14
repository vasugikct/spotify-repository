// server.js
// Main entry point for Spotify Tamil Web Application & AI Assistant

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { requestLogger } = require('./config/logger');
const { connectMongo } = require('./config/db-mongo');
const apiRoutes = require('./routes/api');
const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MongoDB connection (with automatic graceful fallback)
connectMongo();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const publicDir = path.resolve(__dirname, 'public');

// Serve static assets
app.use(express.static(publicDir));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', healthRoutes);

// Page Routes (Clean URLs)
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: publicDir });
});

app.get('/faq', (req, res) => {
  res.sendFile('faq.html', { root: publicDir });
});

app.get('/premium', (req, res) => {
  res.sendFile('premium.html', { root: publicDir });
});

app.get('/errors', (req, res) => {
  res.sendFile('errors.html', { root: publicDir });
});

app.get('/health', (req, res) => {
  res.sendFile('health.html', { root: publicDir });
});

// Route to deliberately test the custom 500 page
app.get('/test-500', (req, res, next) => {
  const testError = new Error('Deliberate Test: Simulated Kollywood Audio Server Crash');
  testError.status = 500;
  next(testError);
});

// Custom 404 Handler
app.use((req, res, next) => {
  res.status(404);
  if (req.accepts('html')) {
    res.sendFile('404.html', { root: publicDir });
  } else if (req.accepts('json')) {
    res.json({
      status: 404,
      error: 'Not Found',
      message: 'The requested Tamil track or endpoint was not found.',
      askAssistant: 'Use POST /api/ai/chat with message: "Explain error 404"'
    });
  } else {
    res.type('txt').send('404 Not Found - Spotify Tamil');
  }
});

// Custom 500 Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`💥 [${statusCode}] Server Error:`, err.message);

  res.status(statusCode);
  if (req.accepts('html')) {
    res.sendFile('500.html', { root: publicDir });
  } else if (req.accepts('json')) {
    res.json({
      status: statusCode,
      error: 'Internal Server Error',
      message: err.message || 'Something went wrong in the Kollywood streaming studio.',
      askAssistant: 'Use POST /api/ai/chat with message: "Explain error 500"'
    });
  } else {
    res.type('txt').send('500 Internal Server Error - Spotify Tamil');
  }
});

// Start HTTP Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎵 SPOTIFY TAMIL WEB APP & AI ASSISTANT RUNNING`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📄 Home Player:  http://localhost:${PORT}/`);
  console.log(`❓ FAQ Page:     http://localhost:${PORT}/faq`);
  console.log(`💎 Premium Page: http://localhost:${PORT}/premium`);
  console.log(`⚠️ Error Lab:    http://localhost:${PORT}/errors`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log(`======================================================\n`);
});

module.exports = app;

