// config/db-mongo.js
// MongoDB connection & schema for Chat Logs and Feedback, with reliable fallback

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isConnected = false;
let connectionError = null;

// Fallback in-memory & file storage if MongoDB URI is not set
const fallbackFile = path.join(__dirname, '..', 'data', 'mongo_fallback_store.json');
let fallbackStore = { chatLogs: [], feedback: [] };

if (fs.existsSync(fallbackFile)) {
  try {
    fallbackStore = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
  } catch (e) {
    fallbackStore = { chatLogs: [], feedback: [] };
  }
}

function persistFallback() {
  try {
    fs.writeFileSync(fallbackFile, JSON.stringify(fallbackStore, null, 2));
  } catch (err) {
    console.error('Failed to persist fallback store:', err.message);
  }
}

// Mongoose Schemas
const chatLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  message: { type: String, required: true },
  intent: { type: String, default: 'general' },
  resolvedByFaq: { type: Boolean, default: false },
  ticketCreated: { type: Boolean, default: false },
  ticketNumber: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  category: { type: String, default: 'General' },
  timestamp: { type: Date, default: Date.now }
});

let ChatLogModel = null;
let FeedbackModel = null;

async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI not provided. Operating in MongoDB Fallback Storage mode (JSON/Memory).');
    connectionError = 'MONGODB_URI environment variable not configured';
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000
    });
    isConnected = true;
    connectionError = null;
    ChatLogModel = mongoose.model('ChatLog', chatLogSchema);
    FeedbackModel = mongoose.model('Feedback', feedbackSchema);
    console.log('✅ MongoDB connected successfully to Atlas / Database.');
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.warn('⚠️ MongoDB connection failed. Falling back to local persistent store:', err.message);
  }
}

// Log a chat message
async function logChatMessage({ sessionId, role, message, intent = 'general', resolvedByFaq = false, ticketCreated = false, ticketNumber = null }) {
  const entry = {
    sessionId: sessionId || 'anon-session',
    role,
    message,
    intent,
    resolvedByFaq,
    ticketCreated,
    ticketNumber,
    timestamp: new Date()
  };

  if (isConnected && ChatLogModel) {
    try {
      const doc = new ChatLogModel(entry);
      return await doc.save();
    } catch (err) {
      console.error('Error saving chat log to MongoDB:', err.message);
    }
  }

  // Fallback storage
  fallbackStore.chatLogs.unshift(entry);
  if (fallbackStore.chatLogs.length > 200) fallbackStore.chatLogs.pop();
  persistFallback();
  return entry;
}

// Log user feedback
async function saveFeedback({ sessionId, rating, comment = '', category = 'General' }) {
  const entry = {
    sessionId: sessionId || 'anon-session',
    rating: Number(rating),
    comment,
    category,
    timestamp: new Date()
  };

  if (isConnected && FeedbackModel) {
    try {
      const doc = new FeedbackModel(entry);
      return await doc.save();
    } catch (err) {
      console.error('Error saving feedback to MongoDB:', err.message);
    }
  }

  fallbackStore.feedback.unshift(entry);
  if (fallbackStore.feedback.length > 100) fallbackStore.feedback.pop();
  persistFallback();
  return entry;
}

// Fetch logs
async function getChatLogs(limit = 50) {
  if (isConnected && ChatLogModel) {
    try {
      return await ChatLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) {
      console.error('Error fetching logs from MongoDB:', err.message);
    }
  }
  return fallbackStore.chatLogs.slice(0, limit);
}

// Fetch feedback
async function getAllFeedback(limit = 50) {
  if (isConnected && FeedbackModel) {
    try {
      return await FeedbackModel.find().sort({ timestamp: -1 }).limit(limit).lean();
    } catch (err) {
      console.error('Error fetching feedback from MongoDB:', err.message);
    }
  }
  return fallbackStore.feedback.slice(0, limit);
}

function checkMongoHealth() {
  return {
    status: isConnected ? 'CONNECTED' : 'FALLBACK_STORAGE',
    isAtlas: isConnected,
    mode: isConnected ? 'MongoDB Live Connection' : 'Fallback File/Memory Storage',
    error: connectionError,
    chatLogsCount: fallbackStore.chatLogs.length,
    feedbackCount: fallbackStore.feedback.length
  };
}

module.exports = {
  connectMongo,
  logChatMessage,
  saveFeedback,
  getChatLogs,
  getAllFeedback,
  checkMongoHealth
};

