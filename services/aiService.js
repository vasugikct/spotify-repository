// services/aiService.js
// Handles AI assistant query processing: FAQ matching, Error Code explanation, Support Ticket creation, and Gemini integration

const dbSql = require('../config/db-sql');
const dbMongo = require('../config/db-mongo');

// Catalog of 8 Standard + Site-Specific Error Codes
const ERROR_CODES_CATALOG = {
  '400': {
    code: 400,
    name: 'Bad Request',
    category: 'Client Error',
    kollywoodContext: 'The Spotify Tamil audio player sent an invalid request. Usually caused by missing track IDs or corrupted query parameters in Kollywood search filters.',
    troubleshooting: 'Check your search query or URL format. Refresh the playlist page or clear local app cache.'
  },
  '401': {
    code: 401,
    name: 'Unauthorized',
    category: 'Authentication',
    kollywoodContext: 'Your Spotify Tamil session has expired or you are not logged in. Private Tamil playlists and personalized mixes require active authentication.',
    troubleshooting: 'Click "Log In" at the top right of the Spotify Tamil player or re-enter your account credentials.'
  },
  '403': {
    code: 403,
    name: 'Forbidden',
    category: 'Authorization',
    kollywoodContext: 'Access is forbidden. This Tamil soundtrack contains explicit Kollywood dialogue or lyrics blocked under your account’s Parental Controls, or requires a VIP tier.',
    troubleshooting: 'Check Settings > Content Filters to allow explicit lyrics, or verify that your subscription has permission for this track.'
  },
  '404': {
    code: 404,
    name: 'Not Found',
    category: 'Resource Missing',
    kollywoodContext: 'The requested Tamil track, movie album (e.g., Leo, Jailer), or playlist does not exist in our library or the link is broken.',
    troubleshooting: 'Check the URL spelling, use the search bar to locate the track by movie name or composer (Anirudh, ARR), or return to the Home page.'
  },
  '429': {
    code: 429,
    name: 'Too Many Requests (Rate Limit)',
    category: 'Rate Limiting',
    kollywoodContext: 'You have triggered rate-limiting by skipping more than 6 Tamil songs in 30 seconds on a Free account, or sending rapid API calls.',
    troubleshooting: 'Wait 30 seconds for the cooldown timer to reset, or upgrade to Spotify Tamil Premium for truly unlimited skips.'
  },
  '500': {
    code: 500,
    name: 'Internal Server Error',
    category: 'Server Fault',
    kollywoodContext: 'An unexpected server-side exception occurred in the Spotify Tamil audio streaming backend or database cluster.',
    troubleshooting: 'Our engineering crew has been alerted. Please reload the player in a minute, or check /health for system status.'
  },
  '503': {
    code: 503,
    name: 'Service Unavailable',
    category: 'Maintenance / Outage',
    kollywoodContext: 'Spotify Tamil audio streaming nodes or CDN distribution servers are temporarily offline for scheduled Kollywood release maintenance or traffic spikes.',
    troubleshooting: 'The service will resume shortly. Check our /health dashboard for real-time node status.'
  },
  '488': {
    code: 488,
    name: 'Track Region Restricted (Site-Specific Kollywood Code)',
    category: 'Geo-Licensing',
    kollywoodContext: 'This Tamil movie soundtrack has digital distribution rights restricted exclusively to India / Tamil Nadu by the movie production banner (e.g., Sun Pictures, Lyca, Raaj Kamal Films).',
    troubleshooting: 'If you are listening from outside India, purchase an International Tamil Music Pass or connect with an Indian region profile.'
  },
  '499': {
    code: 499,
    name: 'Concurrent Stream Limit Exceeded (Site-Specific Code)',
    category: 'Account Limitation',
    kollywoodContext: 'Your Spotify Tamil Family / Duo subscription is already actively streaming audio on the maximum number of simultaneous devices.',
    troubleshooting: 'Pause playback on another family device or upgrade to additional account slots.'
  }
};

/**
 * Intelligent keyword-based FAQ and Error code matcher with sentiment & escalation support
 */
async function processAssistantQuery(userMessage, sessionId = 'default-session') {
  const queryLower = (userMessage || '').toLowerCase().trim();

  // 1. Detect if user is asking about an error code
  for (const [code, info] of Object.entries(ERROR_CODES_CATALOG)) {
    const patterns = [
      new RegExp(`\\b${code}\\b`),
      new RegExp(`error\\s*${code}`, 'i'),
      new RegExp(info.name.toLowerCase(), 'i')
    ];

    if (patterns.some(p => p.test(queryLower))) {
      const response = `### ⚠️ Explanation for Error **${info.code}: ${info.name}**\n\n` +
        `**Category:** ${info.category}\n\n` +
        `**Kollywood Music Context:**\n${info.kollywoodContext}\n\n` +
        `**Recommended Troubleshooting:**\n${info.troubleshooting}\n\n` +
        `*Need further assistance? Just reply "Create a ticket" and I'll log this with our support engineering team.*`;

      await dbMongo.logChatMessage({
        sessionId,
        role: 'assistant',
        message: response,
        intent: 'error_code_explanation',
        resolvedByFaq: true
      });

      return {
        reply: response,
        intent: 'error_explanation',
        errorCode: info.code,
        resolved: true
      };
    }
  }

  // 2. Check for explicit support ticket requests or urgent escalation
  const explicitTicketTriggers = [
    'create ticket', 'file ticket', 'raise ticket', 'support ticket',
    'charged twice', 'double charged', 'money deducted', 'debited twice',
    'fraud', 'scam', 'talk to human', 'speak to human', 'human agent',
    'customer care', 'complaint'
  ];
  const isExplicitTicket = explicitTicketTriggers.some(t => queryLower.includes(t));

  if (isExplicitTicket) {
    const subject = userMessage.length > 55 ? userMessage.substring(0, 52) + '...' : userMessage;
    const isUrgent = /charged|refund|money|fraud|stolen|urgent/i.test(queryLower);
    
    const ticket = await dbSql.createSupportTicket({
      user_name: 'Spotify Tamil Listener',
      user_email: 'listener@kollywood-spotify.io',
      subject: `Support Request: ${subject}`,
      description: userMessage,
      category: isUrgent ? 'Billing & Payments' : 'Customer Support',
      priority: isUrgent ? 'High' : 'Medium',
      source: 'AI Assistant User Request'
    });

    const reply = `### 🎫 Support Ticket Generated: **${ticket.ticket_number}**\n\n` +
      `I have logged an official support ticket for you directly in our SQL database.\n\n` +
      `- **Ticket Number:** \`${ticket.ticket_number}\`\n` +
      `- **Priority:** ${ticket.priority}\n` +
      `- **Status:** Open\n` +
      `- **Subject:** ${ticket.subject}\n` +
      `- **Category:** ${ticket.category}\n` +
      `- **Database:** SQL (\`support_tickets\` table)\n\n` +
      `Our Tamil audio support specialists have received your request and will follow up shortly. Reference code: **${ticket.ticket_number}**.`;

    await dbMongo.logChatMessage({
      sessionId,
      role: 'assistant',
      message: reply,
      intent: 'ticket_created',
      resolvedByFaq: false,
      ticketCreated: true,
      ticketNumber: ticket.ticket_number
    });

    return {
      reply,
      intent: 'ticket_created',
      ticket,
      resolved: true
    };
  }

  // 3. Fetch all FAQs from SQL database
  const allFaqs = await dbSql.getAllFAQs();

  // Common stop words to exclude from keyword scoring
  const STOP_WORDS = new Set([
    'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
    'this', 'that', 'these', 'those', 'with', 'from', 'have', 'has', 'had',
    'does', 'doing', 'done', 'will', 'would', 'shall', 'should', 'can', 'could',
    'been', 'being', 'about', 'some', 'they', 'them', 'their', 'there', 'here',
    'also', 'just', 'more', 'only', 'into', 'over', 'after', 'than', 'then',
    'very', 'your', 'yours', 'mine', 'ours', 'song', 'songs', 'music', 'tamil'
  ]);

  // Search for best matching FAQ
  let bestMatch = null;
  let highestScore = 0;

  for (const faq of allFaqs) {
    const qLower = faq.question.toLowerCase();
    const tagsLower = (faq.tags || '').toLowerCase();
    const aLower = faq.answer.toLowerCase();

    let score = 0;
    const words = queryLower.split(/[\s,?.!]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

    words.forEach(word => {
      if (qLower.includes(word)) score += 4;
      if (tagsLower.includes(word)) score += 3;
      if (aLower.includes(word)) score += 1;
    });

    if (score > highestScore && score >= 4) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch) {
    const reply = `**Q: ${bestMatch.question}**\n\n${bestMatch.answer}\n\n*Category: ${bestMatch.category}* | *Tags: ${bestMatch.tags}*`;
    
    await dbMongo.logChatMessage({
      sessionId,
      role: 'assistant',
      message: reply,
      intent: 'faq_match',
      resolvedByFaq: true
    });

    return {
      reply,
      intent: 'faq_match',
      faqId: bestMatch.id,
      resolved: true
    };
  }

  // 3. Check for casual greetings / intros
  const greetings = ['hi', 'hello', 'hey', 'vanakkam', 'namaste', 'hola', 'start', 'help', 'who are you', 'guide'];
  const isGreeting = greetings.some(g => queryLower === g || queryLower === `${g}!`);

  if (isGreeting) {
    const welcomeReply = `Vanakkam! I'm your **Spotify Tamil AI Assistant**. 🎵\n\n` +
      `I can help you with:\n` +
      `• **Tamil Music FAQs**: Audio quality (Dolby Atmos / Lossless), Tamil/Tanglish lyrics, offline downloads.\n` +
      `• **Error Codes**: Ask me about 400, 401, 403, 404, 429, 500, 503, or site-specific **488 (Region Restricted)** and **499**.\n` +
      `• **Subscriptions**: Spotify Tamil Premium plans (Student ₹59, Individual ₹119, Family ₹179).\n` +
      `• **Support Tickets**: If you have an unanswered question or issue, I'll automatically create a support ticket for you in SQL!`;

    await dbMongo.logChatMessage({
      sessionId,
      role: 'assistant',
      message: welcomeReply,
      intent: 'greeting',
      resolvedByFaq: false
    });

    return {
      reply: welcomeReply,
      intent: 'greeting',
      resolved: false
    };
  }

  // 4. Cannot answer from FAQ or Error Codes -> Automatically create a Support Ticket in SQL!
  const subject = userMessage.length > 55 ? userMessage.substring(0, 52) + '...' : userMessage;
  const isUrgent = /refund|money|charge|debited|fraud|stolen|crash|urgent/i.test(queryLower);
  
  const ticket = await dbSql.createSupportTicket({
    user_name: 'Spotify Tamil Listener',
    user_email: 'listener@kollywood-spotify.io',
    subject: `AI Unanswered Query: ${subject}`,
    description: userMessage,
    category: isUrgent ? 'Billing & Urgent' : 'General Support',
    priority: isUrgent ? 'High' : 'Medium',
    source: 'AI Assistant Auto-Escalation'
  });

  const reply = `### 🎫 Support Ticket Generated: **${ticket.ticket_number}**\n\n` +
    `I couldn't find a direct answer in our Kollywood FAQ or Error Code database, so I have automatically created a support ticket for our engineering and support crew in our SQL database.\n\n` +
    `- **Ticket Number:** \`${ticket.ticket_number}\`\n` +
    `- **Priority:** ${ticket.priority}\n` +
    `- **Status:** Open\n` +
    `- **Subject:** ${ticket.subject}\n` +
    `- **Saved In:** SQL Database (\`support_tickets\` table)\n\n` +
    `Our Tamil music support team will review your inquiry. You can track this ticket anytime using reference code **${ticket.ticket_number}**.`;

  await dbMongo.logChatMessage({
    sessionId,
    role: 'assistant',
    message: reply,
    intent: 'ticket_created',
    resolvedByFaq: false,
    ticketCreated: true,
    ticketNumber: ticket.ticket_number
  });

  return {
    reply,
    intent: 'ticket_created',
    ticket,
    resolved: true
  };
}

module.exports = {
  processAssistantQuery,
  ERROR_CODES_CATALOG
};

