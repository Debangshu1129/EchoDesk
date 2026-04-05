// dashboard.js – Shopkeeper dashboard logic

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ──────────────────────────────────────────────────────────
  const session = JSON.parse(localStorage.getItem('echoSession') || 'null');
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('echoSession');
      window.location.href = 'index.html';
    });
  }

  // ── Refs ─────────────────────────────────────────────────────────────────
  const dashLogin    = document.getElementById('dashLogin');
  const dashMain     = document.getElementById('dashMain');
  const dashPhone    = document.getElementById('dashPhone');
  const dashLoginBtn = document.getElementById('dashLoginBtn');
  const dashError    = document.getElementById('dashError');
  const messageList  = document.getElementById('messageList');
  const sidebarEmpty = document.getElementById('sidebarEmpty');
  const pendingCount = document.getElementById('pendingCount');
  const navBadge     = document.getElementById('navPendingBadge');
  const panelPlaceholder = document.getElementById('panelPlaceholder');
  const panelThread  = document.getElementById('panelThread');
  const threadHeader = document.getElementById('threadHeader');
  const threadBody   = document.getElementById('threadBody');
  const replyInput   = document.getElementById('replyInput');
  const replyBtn     = document.getElementById('replyBtn');
  const toast        = document.getElementById('toast');

  let shopPhone       = '';
  let selectedMsgId   = null;
  let lastMsgCount    = 0;
  let originalTitle   = document.title;
  let flashInterval   = null;

  // ── Phone cleaner ───────────────────────────────────────────────────────
  function cleanPhone(raw) {
    let c = raw.replace(/[\s\-().\u2013\u2014]/g, '');
    c = c.replace(/^(\+91|091|0)/, '');
    return c;
  }

  // ── Messages helpers ────────────────────────────────────────────────────
  function getAllMessages() {
    return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
  }

  function saveAllMessages(msgs) {
    localStorage.setItem('pendingMessages', JSON.stringify(msgs));
  }

  function getMyMessages() {
    return getAllMessages().filter(m => m.businessPhone === shopPhone);
  }

  // ── Login ───────────────────────────────────────────────────────────────
  dashLoginBtn.addEventListener('click', () => {
    dashError.textContent = '';
    dashError.className = 'search-error';

    const raw = dashPhone.value.trim();
    const phone = cleanPhone(raw);

    if (phone.length < 5) {
      dashError.textContent = 'Please enter a valid phone number.';
      dashError.classList.add('search-error--visible', 'search-error--red');
      return;
    }

    // Check if this phone is registered
    const registry = JSON.parse(localStorage.getItem('businessRegistry') || '{}');
    if (!registry[phone]) {
      dashError.textContent = 'This phone number is not registered. Create an agent first.';
      dashError.classList.add('search-error--visible', 'search-error--red');
      return;
    }

    shopPhone = phone;
    dashLogin.style.display = 'none';
    dashMain.classList.remove('dash-main--hidden');
    renderSidebar();
    startPolling();
  });

  dashPhone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); dashLoginBtn.click(); }
  });

  // ── Render sidebar ──────────────────────────────────────────────────────
  function renderSidebar() {
    const msgs = getMyMessages();

    // Sort: pending first, then by time descending
    msgs.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Count pending
    const pending = msgs.filter(m => m.status === 'pending').length;
    pendingCount.textContent = `${pending} pending`;
    navBadge.textContent = pending > 0 ? `💬 ${pending}` : '';

    // Detect new messages
    if (msgs.length > lastMsgCount && lastMsgCount > 0) {
      flashTab();
    }
    lastMsgCount = msgs.length;

    if (msgs.length === 0) {
      messageList.innerHTML = '';
      messageList.appendChild(sidebarEmpty);
      sidebarEmpty.style.display = 'block';
      return;
    }

    sidebarEmpty.style.display = 'none';
    messageList.innerHTML = '';

    msgs.forEach(msg => {
      const item = document.createElement('button');
      item.className = 'dash-msg-item' +
        (msg.status === 'pending' ? ' dash-msg-item--pending' : '') +
        (msg.id === selectedMsgId ? ' dash-msg-item--active' : '');

      const time = new Date(msg.timestamp);
      const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      item.innerHTML = `
        <div class="dash-msg-item__top">
          <span class="dash-msg-item__name">${msg.customerName || 'Customer'}</span>
          <span class="dash-msg-item__time">${dateStr} ${timeStr}</span>
        </div>
        <p class="dash-msg-item__preview">${msg.customerMessage.substring(0, 60)}${msg.customerMessage.length > 60 ? '…' : ''}</p>
        <span class="dash-msg-item__status dash-msg-item__status--${msg.status}">
          ${msg.status === 'pending' ? '🟡 Pending' : '✅ Replied'}
        </span>
      `;

      item.addEventListener('click', () => selectMessage(msg.id));
      messageList.appendChild(item);
    });
  }

  // ── Select a message — show in right panel ──────────────────────────────
  function selectMessage(id) {
    selectedMsgId = id;
    const msg = getAllMessages().find(m => m.id === id);
    if (!msg) return;

    panelPlaceholder.style.display = 'none';
    panelThread.classList.remove('dash-panel__thread--hidden');

    const time = new Date(msg.timestamp);
    const timeStr = time.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    threadHeader.innerHTML = `
      <span class="dash-thread__customer">${msg.customerName || 'Customer'}</span>
      <span class="dash-thread__time">${timeStr}</span>
    `;

    threadBody.innerHTML = '';

    // Customer message bubble
    const custBubble = document.createElement('div');
    custBubble.className = 'bubble bubble--user';
    custBubble.innerHTML = `
      <span class="bubble__sender">${msg.customerName || 'Customer'}</span>
      <p>${msg.customerMessage}</p>
    `;
    threadBody.appendChild(custBubble);

    // Reply bubble or awaiting
    if (msg.agentReply) {
      const replyBubble = document.createElement('div');
      replyBubble.className = 'bubble bubble--agent';
      replyBubble.innerHTML = `
        <span class="bubble__sender">You (Shop)</span>
        <p>${msg.agentReply}</p>
      `;
      threadBody.appendChild(replyBubble);

      // Hide reply box for replied messages
      document.getElementById('replyBox').style.display = 'none';
    } else {
      const awaiting = document.createElement('div');
      awaiting.className = 'dash-awaiting';
      awaiting.textContent = '⏳ Awaiting your reply…';
      threadBody.appendChild(awaiting);

      // Show reply box
      document.getElementById('replyBox').style.display = 'flex';
      replyInput.value = '';
      replyInput.focus();
    }

    renderSidebar(); // refresh active state
  }

  // ── Send reply ──────────────────────────────────────────────────────────
  replyBtn.addEventListener('click', sendReply);
  replyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendReply(); }
  });

  function sendReply() {
    const text = replyInput.value.trim();
    if (!text || !selectedMsgId) return;

    const msgs = getAllMessages();
    const idx = msgs.findIndex(m => m.id === selectedMsgId);
    if (idx === -1) return;

    msgs[idx].agentReply = text;
    msgs[idx].status = 'replied';
    saveAllMessages(msgs);

    // Toast
    toast.textContent = 'Reply sent! ✅';
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 3000);

    // Refresh
    selectMessage(selectedMsgId);
  }

  // ── Polling for new messages ────────────────────────────────────────────
  let pollTimer = null;
  function startPolling() {
    pollTimer = setInterval(() => {
      renderSidebar();
      // If a message is selected, refresh it too
      if (selectedMsgId) {
        const msg = getAllMessages().find(m => m.id === selectedMsgId);
        if (msg) selectMessage(selectedMsgId);
      }
    }, 5000);
  }

  // ── Tab title flash for new messages ────────────────────────────────────
  function flashTab() {
    if (flashInterval) return;
    let on = false;
    flashInterval = setInterval(() => {
      document.title = on ? originalTitle : '💬 New Message — EchoDesk';
      on = !on;
    }, 1000);

    // Stop flashing when user focuses window
    window.addEventListener('focus', () => {
      if (flashInterval) {
        clearInterval(flashInterval);
        flashInterval = null;
        document.title = originalTitle;
      }
    }, { once: true });
  }

  // ── Notification sound ──────────────────────────────────────────────────
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* ignore audio errors */ }
  }

});
