// public/js/chat-widget.js
// Floating AI Chat Widget — present on every page

(function () {
  const SESSION_ID = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  // Inject HTML for the FAB + Panel
  document.addEventListener('DOMContentLoaded', () => {
    const widgetHTML = `
    <!-- Chat Floating Action Button -->
    <button class="chat-fab" id="chatFab" title="Ask Spotify Tamil AI Assistant">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
      <span class="badge-dot"></span>
    </button>

    <!-- Chat Panel -->
    <div class="chat-panel" id="chatPanel">
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-avatar">🎵</div>
          <div class="chat-header-info">
            <h4>Spotify Tamil AI</h4>
            <p><span class="dot-online"></span> Online — FAQ + Error Codes</p>
          </div>
        </div>
        <button class="chat-close" id="chatClose">&times;</button>
      </div>

      <div class="chat-messages" id="chatMessages">
        <div class="chat-bubble assistant">
          Vanakkam! 🙏 I'm your <strong>Spotify Tamil AI Assistant</strong>.<br><br>
          Ask me about:<br>
          • Tamil music FAQs<br>
          • Error codes (400, 401, 403, 404, 429, 500, 503, 488)<br>
          • Subscription plans<br>
          • Or say <strong>"Create a ticket"</strong> for support!
        </div>
      </div>

      <div class="chat-quick-actions" id="chatQuickActions">
        <button class="quick-chip" data-msg="What is Error 404?">Error 404</button>
        <button class="quick-chip" data-msg="How do I download Tamil songs offline?">Offline Mode</button>
        <button class="quick-chip" data-msg="Tell me about Dolby Atmos quality">Dolby Atmos</button>
        <button class="quick-chip" data-msg="What is Error 488?">Error 488</button>
        <button class="quick-chip" data-msg="Create a support ticket for payment issue">Create Ticket</button>
      </div>

      <div class="chat-feedback" id="chatFeedback" style="display:none;">
        <span>Rate this chat:</span>
        <button class="star-btn" data-star="1">★</button>
        <button class="star-btn" data-star="2">★</button>
        <button class="star-btn" data-star="3">★</button>
        <button class="star-btn" data-star="4">★</button>
        <button class="star-btn" data-star="5">★</button>
      </div>

      <div class="chat-input-area">
        <input type="text" id="chatInput" placeholder="Ask about Tamil music, errors, plans…" autocomplete="off" />
        <button class="chat-send-btn" id="chatSend" title="Send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container);

    // Elements
    const fab = document.getElementById('chatFab');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const messagesDiv = document.getElementById('chatMessages');
    const quickActions = document.getElementById('chatQuickActions');
    const feedbackDiv = document.getElementById('chatFeedback');
    let messageCount = 0;

    // Toggle panel
    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      fab.style.display = panel.classList.contains('open') ? 'none' : 'flex';
      if (panel.classList.contains('open')) input.focus();
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      fab.style.display = 'flex';
    });

    // Send message
    async function sendMessage(text) {
      if (!text || !text.trim()) return;
      const userText = text.trim();

      // Add user bubble
      appendBubble(userText, 'user');
      input.value = '';
      sendBtn.disabled = true;

      // Show typing indicator
      const typingEl = showTyping();

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, sessionId: SESSION_ID })
        });
        const data = await res.json();

        removeTyping(typingEl);

        if (data.success && data.reply) {
          appendBubble(data.reply, 'assistant');
        } else {
          appendBubble('Sorry, something went wrong. Please try again.', 'assistant');
        }
      } catch (err) {
        removeTyping(typingEl);
        appendBubble('⚠️ Network error. Please check your connection and try again.', 'assistant');
      }

      sendBtn.disabled = false;
      messageCount++;
      if (messageCount >= 3) {
        feedbackDiv.style.display = 'flex';
      }
    }

    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage(input.value);
    });

    // Quick action chips
    quickActions.addEventListener('click', (e) => {
      const chip = e.target.closest('.quick-chip');
      if (chip) {
        sendMessage(chip.dataset.msg);
      }
    });

    // Feedback stars
    feedbackDiv.addEventListener('click', async (e) => {
      const starBtn = e.target.closest('.star-btn');
      if (!starBtn) return;
      const rating = parseInt(starBtn.dataset.star, 10);

      // Fill stars
      feedbackDiv.querySelectorAll('.star-btn').forEach((b, i) => {
        b.classList.toggle('filled', i < rating);
      });

      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: SESSION_ID, rating, comment: 'Chat widget rating', category: 'AI Chat' })
        });
      } catch (e) { /* silent */ }

      setTimeout(() => {
        feedbackDiv.innerHTML = '<span style="color:#1db954;font-size:0.8rem;">✓ Thanks for your feedback!</span>';
      }, 600);
    });

    function appendBubble(text, role) {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${role}`;
      // Simple markdown-ish rendering for assistant
      if (role === 'assistant') {
        let html = text
          .replace(/### (.+)/g, '<strong style="font-size:1rem;">$1</strong>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code style="background:#333;padding:1px 5px;border-radius:3px;font-size:0.82rem;">$1</code>')
          .replace(/\n/g, '<br>');
        bubble.innerHTML = html;
      } else {
        bubble.textContent = text;
      }
      messagesDiv.appendChild(bubble);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'chat-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messagesDiv.appendChild(typing);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return typing;
    }

    function removeTyping(el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  });
})();

