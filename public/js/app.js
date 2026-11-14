// public/js/app.js
// Main frontend logic for the Spotify Tamil music player

(function () {
  let allTracks = [];
  let currentTrack = null;
  let isPlaying = false;
  let audio = new Audio();
  let currentFilter = 'All';

  document.addEventListener('DOMContentLoaded', async () => {
    // Only run on Home page
    const cardsGrid = document.getElementById('tracksGrid');
    if (!cardsGrid) return;

    await loadTracks();
    setupFilterChips();
    setupSearch();
    loadThirdPartyWidget();
  });

  async function loadTracks(genre, search) {
    const grid = document.getElementById('tracksGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:#a7a7a7;text-align:center;padding:40px;">Loading Tamil tracks…</p>';

    try {
      let url = '/api/tracks?';
      if (genre && genre !== 'All') url += `genre=${encodeURIComponent(genre)}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      allTracks = data.tracks || [];
      renderCards(allTracks);
    } catch (err) {
      grid.innerHTML = '<p style="color:#f15e6c;text-align:center;padding:40px;">Failed to load tracks.</p>';
    }
  }

  function renderCards(tracks) {
    const grid = document.getElementById('tracksGrid');
    if (!grid) return;

    if (!tracks.length) {
      grid.innerHTML = '<p style="color:#a7a7a7;text-align:center;padding:40px;">No tracks found matching your filter.</p>';
      return;
    }

    grid.innerHTML = tracks.map((t, idx) => `
      <div class="music-card" data-idx="${idx}" onclick="window._playTrack(${idx})">
        <div class="card-art-wrap">
          <img class="card-art" src="${t.albumArt}" alt="${t.title}" loading="lazy" onerror="this.style.display='none'" />
          <button class="card-play-btn" onclick="event.stopPropagation(); window._playTrack(${idx})">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
        </div>
        <div class="card-title">${t.title}</div>
        <div class="card-subtitle">${t.movie} · ${t.artists.split(',')[0]}</div>
        <span class="card-genre-tag">${t.genre}</span>
      </div>
    `).join('');
  }

  window._playTrack = function (idx) {
    const track = allTracks[idx];
    if (!track) return;
    currentTrack = track;

    // Update now-playing bar
    const npArt = document.getElementById('npArt');
    const npTitle = document.getElementById('npTitle');
    const npArtist = document.getElementById('npArtist');
    if (npArt) npArt.src = track.albumArt;
    if (npTitle) npTitle.textContent = track.title;
    if (npArtist) npArtist.textContent = track.artists.split(',')[0];

    // Play preview audio
    if (track.audioUrl) {
      audio.src = track.audioUrl;
      audio.play().catch(() => {});
      isPlaying = true;
      updatePlayPauseBtn();
    }

    // Highlight playing card
    document.querySelectorAll('.music-card').forEach(c => c.classList.remove('playing'));
    const card = document.querySelector(`.music-card[data-idx="${idx}"]`);
    if (card) card.classList.add('playing');
  };

  // Play/pause toggle
  window._togglePlay = function () {
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    isPlaying = !isPlaying;
    updatePlayPauseBtn();
  };

  function updatePlayPauseBtn() {
    const btn = document.getElementById('playPauseBtn');
    if (!btn) return;
    btn.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>';
  }

  // Audio time progress
  audio.addEventListener('timeupdate', () => {
    const fill = document.getElementById('seekFill');
    const curTime = document.getElementById('curTime');
    if (!fill || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = pct + '%';
    if (curTime) curTime.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    const totalTime = document.getElementById('totalTime');
    if (totalTime) totalTime.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayPauseBtn();
  });

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // Volume
  window._setVolume = function (val) {
    audio.volume = val / 100;
  };

  // Filter chips
  function setupFilterChips() {
    const container = document.getElementById('filterChips');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.genre || 'All';
      loadTracks(currentFilter);
    });
  }

  // Search
  function setupSearch() {
    const input = document.getElementById('mainSearch');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        loadTracks(currentFilter, input.value);
      }, 350);
    });
  }

  // Third-party trending widget
  async function loadThirdPartyWidget() {
    const container = document.getElementById('tpWidget');
    if (!container) return;
    try {
      const res = await fetch('/api/third-party/trending');
      const data = await res.json();
      const badge = data.mode === 'LIVE_EXTERNAL_API'
        ? '<span class="tp-badge-live">LIVE API</span>'
        : '<span class="tp-badge-fallback">FALLBACK CACHE</span>';

      const tracksList = (data.data?.tracks || []).slice(0, 3).map(t =>
        `#${t.rank} ${t.title} — ${t.movie}`
      ).join(' · ');

      container.innerHTML = `
        <div class="tp-left">
          <div class="tp-icon">📊</div>
          <div class="tp-info">
            <h4>Kollywood Trending Now ${badge}</h4>
            <p>${tracksList || 'Loading trending data…'} · ${data.durationMs || '?'}ms</p>
          </div>
        </div>
        <div class="tp-controls">
          <button class="btn-pill btn-outline" style="font-size:0.75rem;" onclick="window._refreshTrending()">Refresh</button>
          <button class="btn-pill btn-outline" style="font-size:0.75rem;" onclick="window._testFallback()">Test Fallback</button>
        </div>`;
    } catch (err) {
      container.innerHTML = '<div class="tp-left"><div class="tp-icon">⚠️</div><div class="tp-info"><h4>Third-Party API Unavailable</h4><p>Fallback cache active</p></div></div>';
    }
  }

  window._refreshTrending = async function () {
    await loadThirdPartyWidget();
  };

  window._testFallback = async function () {
    const container = document.getElementById('tpWidget');
    if (!container) return;
    try {
      const res = await fetch('/api/third-party/trending?simulateTimeout=true');
      const data = await res.json();
      container.querySelector('.tp-info h4').innerHTML = `Kollywood Trending Now <span class="tp-badge-fallback">FALLBACK (${data.reason})</span>`;
    } catch (e) { /* silent */ }
  };

  // Lyrics modal
  window._showLyrics = function () {
    if (!currentTrack) return;
    const overlay = document.getElementById('lyricsModal');
    if (!overlay) return;
    const title = overlay.querySelector('.modal-title');
    const body = overlay.querySelector('.modal-body');
    if (title) title.textContent = `${currentTrack.title} — Lyrics`;
    if (body) {
      body.innerHTML = `<div style="margin-bottom:16px;">
        <button class="chip active" onclick="document.getElementById('lyricsText').textContent=this.dataset.t; document.querySelectorAll('.lyrics-toggle .chip').forEach(c=>c.classList.remove('active')); this.classList.add('active');" data-t="${(currentTrack.lyricsTamil||'').replace(/"/g,'&quot;')}">தமிழ்</button>
        <button class="chip" onclick="document.getElementById('lyricsText').textContent=this.dataset.t; document.querySelectorAll('.lyrics-toggle .chip').forEach(c=>c.classList.remove('active')); this.classList.add('active');" data-t="${(currentTrack.lyricsTanglish||'').replace(/"/g,'&quot;')}">Tanglish</button>
      </div>
      <div id="lyricsText" style="white-space:pre-line;">${currentTrack.lyricsTamil || 'Lyrics not available for this track.'}</div>`;
    }
    overlay.classList.add('open');
  };

  window._closeLyrics = function () {
    const overlay = document.getElementById('lyricsModal');
    if (overlay) overlay.classList.remove('open');
  };
})();

