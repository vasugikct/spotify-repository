// config/db-sql.js
// SQLite database connection & schema initialization for FAQs and Support Tickets

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'spotify_tamil.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`✅ SQLite connected at: ${dbPath}`);
    initializeSchema();
  }
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initializeSchema() {
  try {
    // 1. FAQs Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Support Tickets Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT UNIQUE NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Open',
        source TEXT DEFAULT 'AI Assistant',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);

    // Check if FAQs need seeding
    const countRow = await getOne('SELECT COUNT(*) as count FROM faqs');
    if (countRow.count === 0) {
      console.log('🌱 Seeding initial Tamil Music FAQs into SQL database...');
      const seedFile = path.join(__dirname, '..', 'data', 'seed-faqs.json');
      if (fs.existsSync(seedFile)) {
        const faqs = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        for (const item of faqs) {
          await runQuery(
            `INSERT INTO faqs (question, answer, category, tags) VALUES (?, ?, ?, ?)`,
            [item.question, item.answer, item.category, item.tags || '']
          );
        }
        console.log(`✅ Seeded ${faqs.length} FAQs successfully into SQL database.`);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing SQL schema:', error);
  }
}

// Helper query functions
async function getAllFAQs(category, search) {
  let sql = 'SELECT * FROM faqs WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search && search.trim() !== '') {
    sql += ' AND (question LIKE ? OR answer LIKE ? OR tags LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY id ASC';
  return await getAll(sql, params);
}

async function getFAQById(id) {
  return await getOne('SELECT * FROM faqs WHERE id = ?', [id]);
}

async function incrementFAQHelpful(id) {
  await runQuery('UPDATE faqs SET helpful_count = helpful_count + 1 WHERE id = ?', [id]);
  return await getFAQById(id);
}

async function createSupportTicket(ticketData) {
  const ticketNumber = 'TICK-' + Math.floor(100000 + Math.random() * 900000);
  const {
    user_name = 'Spotify User',
    user_email = 'support@kollywood-spotify.io',
    subject,
    description,
    category = 'AI Escalation',
    priority = 'Medium',
    source = 'AI Assistant'
  } = ticketData;

  const result = await runQuery(
    `INSERT INTO support_tickets (ticket_number, user_name, user_email, subject, description, category, priority, status, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)`,
    [ticketNumber, user_name, user_email, subject, description, category, priority, source]
  );

  return {
    id: result.lastID,
    ticket_number: ticketNumber,
    user_name,
    user_email,
    subject,
    description,
    priority,
    status: 'Open',
    created_at: new Date().toISOString()
  };
}

async function getAllTickets(limit = 50) {
  return await getAll('SELECT * FROM support_tickets ORDER BY id DESC LIMIT ?', [limit]);
}

async function getTicketByNumber(ticketNumber) {
  return await getOne('SELECT * FROM support_tickets WHERE ticket_number = ?', [ticketNumber]);
}

async function checkSQLHealth() {
  const start = Date.now();
  try {
    const row = await getOne('SELECT COUNT(*) as faqCount FROM faqs');
    const ticketRow = await getOne('SELECT COUNT(*) as ticketCount FROM support_tickets');
    return {
      status: 'UP',
      engine: 'SQLite (SQL)',
      latencyMs: Date.now() - start,
      faqCount: row ? row.faqCount : 0,
      ticketCount: ticketRow ? ticketRow.ticketCount : 0
    };
  } catch (err) {
    return {
      status: 'DOWN',
      engine: 'SQLite (SQL)',
      error: err.message
    };
  }
}

module.exports = {
  db,
  getAllFAQs,
  getFAQById,
  incrementFAQHelpful,
  createSupportTicket,
  getAllTickets,
  getTicketByNumber,
  checkSQLHealth
};

