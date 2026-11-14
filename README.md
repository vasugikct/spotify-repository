# 🎵 Spotify Tamil — Original Kollywood Music Platform with AI Assistant

> **Live Website:** [https://spotify-tamil-ai.onrender.com](https://spotify-tamil-ai.onrender.com)

A responsive Spotify-style web application featuring original Tamil cinema (Kollywood) music, an integrated AI assistant, FAQ system backed by SQL database, error code explorer, support ticketing, and a health monitoring dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-SQL_Database-blue?logo=sqlite)
![MongoDB](https://img.shields.io/badge/MongoDB-Chat_Logs-green?logo=mongodb)
![Render](https://img.shields.io/badge/Deployed_on-Render-purple?logo=render)

---

## ✨ Features

### 📄 Pages (5+ Responsive Pages)
| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Music player with track cards, genre filters, search, Kollywood billboard, and lyrics modal |
| **FAQ** | `/faq` | 12 FAQs stored in SQL database with search, category filtering, and helpful voting |
| **Premium** | `/premium` | Subscription plans (Free, Mini, Student, Individual, Duo, Family) with genres and payment methods |
| **Error Lab** | `/errors` | All 9 error codes (400, 401, 403, 404, 429, 500, 503 + site-specific 488 & 499) with live simulator |
| **Health** | `/health` | Real-time system health dashboard with request logging, DB status, and third-party API monitoring |
| **Custom 404** | Any invalid URL | Branded 404 page with "Ask the Assistant" option |
| **Custom 500** | `/test-500` | Branded 500 page with "Ask the Assistant" option |

### 🤖 AI Assistant (Chat Widget on Every Page)
- Answers from the FAQ database (SQL-backed keyword matching)
- Explains all 9 error codes with Kollywood-specific context
- Automatically creates support tickets in SQL when it cannot answer
- Quick action chips for common queries
- Star-rating feedback system stored in MongoDB
- Chat logs stored in MongoDB (or fallback JSON storage)

### 🗄️ Database Architecture
- **SQL (SQLite):** FAQs (12 entries) and Support Tickets
- **MongoDB:** Chat logs and user feedback (with automatic fallback to local JSON file storage)

### 🌐 Third-Party API Integration
- **Apple iTunes Search API** for live Kollywood trending data
- Configurable timeout (default 2.5s) with automatic fallback cache
- "Test Fallback" button to demonstrate timeout handling

### 🔒 Security
- All API keys stored in environment variables (`.env`)
- `.gitignore` excludes `.env`, `node_modules/`, and database files
- No confidential information in the repository

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/vasugikct/spotify-tamil-ai.git
cd spotify-tamil-ai

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
spotify-tamil-ai/
├── server.js                 # Express app entry point
├── config/
│   ├── db-sql.js             # SQLite connection & schema (FAQs + Tickets)
│   ├── db-mongo.js           # MongoDB connection with fallback (Chat Logs + Feedback)
│   └── logger.js             # Request logging middleware
├── routes/
│   ├── api.js                # REST API for tracks, FAQs, tickets, errors, feedback
│   ├── ai.js                 # AI assistant chat endpoint
│   └── health.js             # Health check & logs endpoints
├── services/
│   ├── aiService.js          # AI query processor (FAQ matching + error codes + ticketing)
│   └── thirdPartyService.js  # iTunes API with timeout & fallback
├── data/
│   ├── seed-faqs.json        # Initial 12 FAQ entries for SQL seeding
│   ├── tamil-tracks.json     # 12 Kollywood track catalog
│   └── fallback-trends.json  # Fallback cache for third-party API
├── public/
│   ├── index.html            # Home page (music player)
│   ├── faq.html              # FAQ page
│   ├── premium.html          # Subscription plans page
│   ├── errors.html           # Error codes explorer
│   ├── health.html           # Health dashboard
│   ├── 404.html              # Custom 404 page
│   ├── 500.html              # Custom 500 page
│   ├── css/
│   │   ├── spotify.css       # Main Spotify dark theme
│   │   └── chat-widget.css   # AI chat widget styles
│   └── js/
│       ├── app.js            # Frontend player logic
│       └── chat-widget.js    # Chat widget (injected on every page)
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── package.json              # Node.js dependencies & scripts
└── README.md                 # This file
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracks` | Get Tamil tracks (filter by genre/search) |
| GET | `/api/faqs` | Get all FAQs from SQL (filter by category/search) |
| POST | `/api/faqs/:id/helpful` | Increment FAQ helpful count |
| POST | `/api/tickets` | Create a support ticket |
| GET | `/api/tickets` | List all support tickets |
| GET | `/api/errors` | Get all 9 error code definitions |
| GET | `/api/errors/simulate/:code` | Simulate a live HTTP error response |
| POST | `/api/ai/chat` | Send a message to the AI assistant |
| GET | `/api/third-party/trending` | Fetch trending data (with timeout + fallback) |
| POST | `/api/feedback` | Submit chat feedback rating |
| GET | `/api/health` | JSON health check |
| GET | `/api/logs` | Recent request logs |

---

## 🎯 Error Codes Handled

| Code | Name | Type |
|------|------|------|
| 400 | Bad Request | Standard |
| 401 | Unauthorized | Standard |
| 403 | Forbidden | Standard |
| 404 | Not Found | Standard + Custom Page |
| 429 | Too Many Requests | Standard |
| 500 | Internal Server Error | Standard + Custom Page |
| 503 | Service Unavailable | Standard |
| **488** | **Track Region Restricted** | **Site-Specific (Kollywood)** |
| **499** | **Concurrent Stream Limit** | **Site-Specific** |

---

## 📱 Mobile Responsive

The site is fully responsive across all breakpoints:
- **Desktop** (900px+): Full sidebar + player + content
- **Tablet** (640-900px): Collapsed icon sidebar
- **Mobile** (<640px): Bottom navigation bar, stacked layout

---

## 💡 Proposed Improvement

**Real-Time AI with Gemini API Integration:** Currently the AI assistant uses keyword-based FAQ matching and rule-based error code detection. A future improvement would integrate the **Google Gemini API** as a conversational AI backbone, enabling natural language understanding, multi-turn context retention, sentiment analysis, and the ability to answer follow-up questions that go beyond the stored FAQ database — while still using the SQL FAQ data as grounding context to ensure accurate, domain-specific Tamil music responses.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **SQL Database:** SQLite3 (FAQs + Support Tickets)
- **NoSQL Database:** MongoDB / Mongoose (Chat Logs + Feedback) with JSON fallback
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (Spotify Dark Theme)
- **Third-Party API:** Apple iTunes Search API (with timeout + fallback)
- **Deployment:** Render (Web Service)

---

## 📝 License

ISC © vasugikct

