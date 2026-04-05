// agent.js – logic for agent.html (Talk to Agent page)

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = JSON.parse(localStorage.getItem('echoSession') || 'null');
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  // ── User greeting + logout ─────────────────────────────────────────────────
  const navGreeting = document.getElementById('navUserGreeting');
  if (navGreeting) navGreeting.textContent = `👋 ${session.name}`;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('echoSession');
      window.location.href = 'index.html';
    });
  }

  // ── Show edit button only for owners ────────────────────────────────────
  const editBtn = document.getElementById('editAgentBtn');
  const userRole = localStorage.getItem('userRole');
  if (editBtn && userRole === 'owner') {
    editBtn.classList.remove('navbar__edit-btn--hidden');
  }

  // ── Load config from localStorage ──────────────────────────────────────────
  const raw = localStorage.getItem('agentConfig');
  if (!raw) {
    window.location.href = 'index.html';
    return;
  }

  const config = JSON.parse(raw);
  const { agentName, businessName, businessDescription, businessHours, faqs } = config;
  const businessPhone = config.businessPhone || '';

  // ── 2. Toast: "Your agent is ready! 🎉" ───────────────────────────────────
  const toast = document.getElementById('toast');
  setTimeout(() => {
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 3000);
  }, 400);

  // ── 3. Inject page title & static fields ──────────────────────────────────
  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = `EchoDesk – ${agentName}`;
  document.getElementById('agentBusiness').textContent = `Your assistant for ${businessName}`;
  document.getElementById('agentAvatar').textContent   = agentName.charAt(0).toUpperCase();
  document.getElementById('agentLabel').textContent    = `${agentName} says:`;

  // ── 4. Typewriter effect for greeting ─────────────────────────────────────
  const greetingEl   = document.getElementById('agentGreeting');
  const greetingText = `Hi, I'm ${agentName} 👋`;
  (function typewrite() {
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    greetingEl.appendChild(cursor);
    let i = 0;
    const iv = setInterval(() => {
      greetingEl.insertBefore(document.createTextNode(greetingText[i]), cursor);
      i++;
      if (i >= greetingText.length) {
        clearInterval(iv);
        setTimeout(() => cursor.remove(), 1200);
      }
    }, 55);
  })();

  // ── 5. Element refs ────────────────────────────────────────────────────────
  const micBtn       = document.getElementById('micBtn');
  const micRipple    = document.getElementById('micRipple');
  const micStatus    = document.getElementById('micStatus');
  const muteBtn      = document.getElementById('muteBtn');
  const muteIcon     = document.getElementById('muteIcon');
  const muteBtnLabel = document.getElementById('muteBtnLabel');
  const userTranscript = document.getElementById('userTranscript');
  const agentResponse  = document.getElementById('agentResponse');
  const thinkingDots   = document.getElementById('thinkingDots');
  const soundwave      = document.getElementById('soundwave');
  const chatHistory    = document.getElementById('chatHistory');

  // ── 6. State ───────────────────────────────────────────────────────────────
  let recognition        = null;
  let isListening        = false;
  let isMuted            = false;
  let isSpeaking         = false;   // true while TTS is playing — mic is locked
  // Conversation memory: stores {role:'user'|'model', text:''} pairs
  const conversationHistory = [];

  // ── 7. Speech Recognition setup ───────────────────────────────────────────
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  if (!SpeechRecognition) {
    micStatus.textContent = 'Please use Google Chrome for voice features';
    micBtn.disabled       = true;
    micBtn.style.opacity  = '0.4';
    micBtn.style.cursor   = 'not-allowed';
    return;
  }

  // ── 8. Mute toggle ─────────────────────────────────────────────────────────
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);
    muteIcon.textContent     = isMuted ? '🔇' : '🔊';
    muteBtnLabel.textContent = isMuted ? 'Unmute' : 'Mute';
    if (isMuted) window.speechSynthesis.cancel();
  });

  // ── 9. Spacebar shortcut ───────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
    e.preventDefault();
    // Block spacebar while agent is speaking or processing
    if (micBtn.disabled || isSpeaking) return;
    isListening ? recognition.stop() : startListening();
  });

  // ── 10. Mic button click ───────────────────────────────────────────────────
  micBtn.addEventListener('click', () => {
    // Block clicks while agent is speaking — mic would pick up speaker audio
    if (micBtn.disabled || isSpeaking) return;
    isListening ? recognition.stop() : startListening();
  });

  // ── 11. Start listening ────────────────────────────────────────────────────
  function startListening() {
    recognition                 = new SpeechRecognition();
    recognition.lang            = 'en-IN';
    recognition.interimResults  = false;
    recognition.maxAlternatives = 1;

    setMicState('listening');

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      userTranscript.textContent = transcript;
      setMicState('thinking');
      handleUserInput(transcript);   // FAQ match first, Gemini fallback
    };

    recognition.onerror = (e) => {
      console.error('SpeechRecognition error:', e.error);
      if (e.error === 'not-allowed') {
        micStatus.textContent = 'Microphone access denied. Check browser permissions.';
      } else if (e.error === 'no-speech') {
        micStatus.textContent = 'No speech detected. Click to try again.';
      } else {
        micStatus.textContent = 'Could not hear you. Click to try again.';
      }
      setMicState('idle', true);
    };

    recognition.onend = () => {
      if (isListening) setMicState('idle');
    };

    recognition.start();
  }

  // ── 12. Mic state manager ──────────────────────────────────────────────────
  function setMicState(state, keepText = false) {
    micBtn.classList.remove('listening', 'processing');
    micRipple.classList.remove('active');
    micStatus.classList.remove('listening', 'processing');
    thinkingDots.classList.remove('thinking-dots--active');

    if (state === 'listening') {
      isListening             = true;
      isSpeaking              = false;
      micBtn.disabled         = false;
      micBtn.style.background = '#ff4444';
      micBtn.style.boxShadow  = '0 0 30px rgba(255,68,68,0.45), 0 0 60px rgba(255,68,68,0.18)';
      micBtn.classList.add('listening');
      micRipple.classList.add('active');
      micStatus.classList.add('listening');
      micStatus.textContent   = 'Listening… click to stop';

    } else if (state === 'thinking') {
      isListening             = false;
      isSpeaking              = false;
      micBtn.disabled         = true;
      micBtn.style.background = '#fbbf24';
      micBtn.style.boxShadow  = '0 0 30px rgba(251,191,36,0.4), 0 0 60px rgba(251,191,36,0.15)';
      micBtn.classList.add('processing');
      micStatus.classList.add('processing');
      micStatus.textContent   = 'Thinking…';
      agentResponse.textContent = '';
      thinkingDots.classList.add('thinking-dots--active');

    } else if (state === 'speaking') {
      // Mic is LOCKED while agent speaks — prevents picking up TTS audio
      isListening             = false;
      isSpeaking              = true;
      micBtn.disabled         = true;
      micBtn.style.background = 'var(--accent)';
      micBtn.style.boxShadow  = '0 0 20px rgba(0,255,136,0.2), 0 0 40px rgba(0,255,136,0.08)';
      micBtn.style.opacity    = '0.6';
      micStatus.textContent   = `${agentName} is speaking…`;

    } else {
      // idle — fully re-enable mic
      isListening             = false;
      isSpeaking              = false;
      micBtn.disabled         = false;
      micBtn.style.background = 'var(--accent)';
      micBtn.style.boxShadow  = '0 0 20px rgba(0,255,136,0.35), 0 0 60px rgba(0,255,136,0.12)';
      micBtn.style.opacity    = '1';
      if (!keepText) micStatus.textContent = 'Click to speak';
    }
  }

  // ── 13. Build system prompt ────────────────────────────────────────────────
  function buildSystemPrompt() {
    let faqBlock = '';
    if (faqs && faqs.length > 0) {
      const filled = faqs.filter(f => f.question && f.question.trim());
      if (filled.length > 0) {
        faqBlock = '\nFAQs you know:\n' +
          filled.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n');
      }
    }
    return `You are ${agentName}, a friendly customer support agent for ${businessName}.
About the business: ${businessDescription}.
Working hours: ${businessHours}.${faqBlock}

Rules:
- Keep responses short (2-3 sentences max)
- Speak naturally like a human receptionist
- Never say you are an AI
- If you don't know something, say you'll check and get back to them
- Always be warm and helpful`;
  }

  // ── 14. FAQ matching engine ────────────────────────────────────────────────

  /**
   * Normalize text: lowercase, remove punctuation, split into unique words.
   */
  function tokenize(text) {
    return [...new Set(
      text.toLowerCase()
          .replace(/[^a-z0-9\s]/gi, '')
          .split(/\s+/)
          .filter(w => w.length > 1)    // drop single-char noise
    )];
  }

  /**
   * Score how well `userTokens` match `faqTokens` (0–1).
   * Uses weighted overlap: each shared word scores 1, partial prefix match scores 0.5.
   */
  function matchScore(userTokens, faqTokens) {
    if (faqTokens.length === 0) return 0;
    let hits = 0;
    for (const ut of userTokens) {
      for (const ft of faqTokens) {
        if (ut === ft)              { hits += 1;   break; }
        if (ft.startsWith(ut) || ut.startsWith(ft)) { hits += 0.5; break; }
      }
    }
    return hits / Math.max(userTokens.length, faqTokens.length);
  }

  /**
   * Search FAQs for the best match to `userText`.
   * Returns { answer, score, question } or null if nothing passes the threshold.
   */
  const FAQ_THRESHOLD = 0.40;   // 40% word overlap = match

  function findFaqMatch(userText) {
    if (!faqs || faqs.length === 0) return null;

    const userTokens = tokenize(userText);
    let best = { score: 0, faq: null };

    for (const faq of faqs) {
      if (!faq.question || !faq.answer) continue;
      const faqTokens = tokenize(faq.question);
      const score     = matchScore(userTokens, faqTokens);
      if (score > best.score) best = { score, faq };
    }

    if (best.score >= FAQ_THRESHOLD && best.faq) {
      console.log(`[FAQ Match] score=${best.score.toFixed(2)} Q="${best.faq.question}"`);
      return best.faq;
    }
    return null;
  }

  // ── 15. Handle user input: FAQ first, forward to shop on no match ─────────
  function handleUserInput(userText) {
    const faqMatch = findFaqMatch(userText);

    if (faqMatch) {
      const reply = faqMatch.answer;

      thinkingDots.classList.remove('thinking-dots--active');
      agentResponse.innerHTML = reply +
        ' <span class="faq-badge">📋 Matched from FAQ</span>';

      conversationHistory.push({ role: 'user',  text: userText });
      conversationHistory.push({ role: 'model', text: reply });

      addBubble('user',  userText);
      addBubble('agent', reply);
      speakReply(reply);

      // Hide forward notice
      forwardNotice.classList.add('forward-notice--hidden');

    } else {
      const fallback = "I don't have that information right now, but I've forwarded your question to the team.";

      thinkingDots.classList.remove('thinking-dots--active');
      agentResponse.innerHTML = fallback +
        ' <span class="faq-badge faq-badge--hold">⏳ Forwarded</span>';

      conversationHistory.push({ role: 'user',  text: userText });
      conversationHistory.push({ role: 'model', text: fallback });

      addBubble('user',  userText);
      addBubble('agent', fallback);
      speakReply(fallback);

      // Show forward chat input
      forwardNotice.classList.remove('forward-notice--hidden');

      // Auto-send the question as a pending message to the shop
      if (businessPhone) {
        sendPendingMessage(userText);
      }
    }
  }

  // ── 16. Build contents array with conversation memory ─────────────────────
  function buildContents(currentUserText) {
    const contents = [];

    // Include last 4 exchanges (up to 8 messages: 4 user + 4 model)
    const history = conversationHistory.slice(-8);
    for (const msg of history) {
      contents.push({
        role:  msg.role,
        parts: [{ text: msg.text }],
      });
    }

    // Append the current user message
    contents.push({
      role:  'user',
      parts: [{ text: currentUserText }],
    });

    return contents;
  }

  // ── 15. Call Gemini API ────────────────────────────────────────────────────
  async function callGemini(userText) {
    const API_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      system_instruction: {
        parts: [{ text: buildSystemPrompt() }],
      },
      contents: buildContents(userText),
      generationConfig: {
        temperature:     0.7,
        maxOutputTokens: 250,
      },
    };

    try {
      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const data = await res.json();
      console.log('[Gemini raw response]', JSON.stringify(data, null, 2));

      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Extract reply — handle safety blocks gracefully
      const candidate    = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      let reply;

      if (finishReason === 'SAFETY' || finishReason === 'BLOCKED') {
        reply = "I'm not able to answer that, but feel free to ask me something about " + businessName + '!';
      } else {
        reply = candidate?.content?.parts?.[0]?.text?.trim() || null;
      }

      if (!reply) {
        console.warn('[Gemini] Empty reply. Full response:', data);
        reply = "Sorry, I didn't get a response. Please try again.";
      }

      // Update conversation memory only on real replies
      conversationHistory.push({ role: 'user',  text: userText });
      conversationHistory.push({ role: 'model', text: reply });

      // Update UI
      thinkingDots.classList.remove('thinking-dots--active');
      agentResponse.textContent = reply;

      addBubble('user',  userText);
      addBubble('agent', reply);

      speakReply(reply);

    } catch (err) {
      console.error('[Gemini API error]', err);
      thinkingDots.classList.remove('thinking-dots--active');
      agentResponse.textContent = "Oops, I couldn't connect. Please try again.";
      setMicState('idle');
    }
  }

  // ── 16. Speech Synthesis — with Chrome onend bug workaround ──────────────
  function speakReply(text) {
    // If muted, skip TTS and go straight to idle
    if (isMuted) {
      setMicState('idle');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.rate   = 1.0;
    utterance.pitch  = 1.1;
    utterance.lang   = 'en-IN';

    function assignVoiceAndSpeak() {
      const voices      = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v =>
        /female|woman|zira|samantha|karen|victoria|moira|tessa|fiona|veena|heera/i.test(v.name)
      );
      if (femaleVoice) utterance.voice = femaleVoice;

      // Lock mic while speaking so microphone can't pick up TTS audio
      setMicState('speaking');
      soundwave.classList.add('soundwave--active');

      let finished = false;

      function onFinish() {
        if (finished) return;
        finished = true;
        clearInterval(resumeInterval);
        clearTimeout(safetyTimeout);
        soundwave.classList.remove('soundwave--active');
        setMicState('idle');
      }

      utterance.onend   = onFinish;
      utterance.onerror = onFinish;

      // ── Chrome bug fix: speechSynthesis can pause silently ──
      // Keep nudging it every 200ms so onend eventually fires.
      const resumeInterval = setInterval(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // If speech stopped without firing onend, clean up manually
        if (!window.speechSynthesis.speaking && !finished) {
          onFinish();
        }
      }, 200);

      // ── Safety timeout: ~60 chars ≈ 1 second of speech at rate 1.0 ──
      // Force unlock the mic after a generous upper-bound duration.
      const approxMs = Math.max(3000, text.length * 60);
      const safetyTimeout = setTimeout(onFinish, approxMs);

      window.speechSynthesis.speak(utterance);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      assignVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        assignVoiceAndSpeak();
      };
    }
  }

  // ── 17. Add chat bubble & auto-scroll ─────────────────────────────────────
  function addBubble(role, text) {
    const empty = document.getElementById('chatEmpty');
    if (empty) empty.remove();

    const bubble = document.createElement('div');
    bubble.className = `bubble bubble--${role}`;

    const sender = document.createElement('span');
    sender.className   = 'bubble__sender';
    sender.textContent = role === 'user' ? 'You' : agentName;

    const msg = document.createElement('p');
    msg.textContent = text;

    bubble.appendChild(sender);
    bubble.appendChild(msg);
    chatHistory.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CUSTOMER → SHOP MESSAGING SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  const forwardNotice  = document.getElementById('forwardNotice');
  const customerChatIn = document.getElementById('customerChatInput');
  const customerChatSend = document.getElementById('customerChatSend');
  const dmSection      = document.getElementById('dmSection');
  const dmHistory      = document.getElementById('dmHistory');

  // ── Send a pending message to the shop ──────────────────────────────────
  function sendPendingMessage(text) {
    const msgs = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    const newMsg = {
      id: Date.now(),
      businessPhone: businessPhone,
      customerName: session.name || 'Customer',
      customerMessage: text,
      agentReply: null,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    msgs.push(newMsg);
    localStorage.setItem('pendingMessages', JSON.stringify(msgs));

    // Show DM section and render
    renderDMHistory();
  }

  // ── Chat input send button ──────────────────────────────────────────────
  if (customerChatSend) {
    customerChatSend.addEventListener('click', () => {
      const text = customerChatIn.value.trim();
      if (!text || !businessPhone) return;
      sendPendingMessage(text);
      customerChatIn.value = '';

      // Show confirmation in agent response
      agentResponse.innerHTML = 'Your message has been sent to the shop. Check back here for a reply.' +
        ' <span class="faq-badge faq-badge--hold">📩 Sent</span>';
    });

    customerChatIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); customerChatSend.click(); }
    });
  }

  // ── Render Direct Message history ───────────────────────────────────────
  function renderDMHistory() {
    if (!businessPhone || !dmHistory) return;

    const msgs = JSON.parse(localStorage.getItem('pendingMessages') || '[]')
      .filter(m => m.businessPhone === businessPhone)
      .sort((a, b) => a.id - b.id);

    if (msgs.length === 0) {
      dmSection.classList.add('dm-section--hidden');
      return;
    }

    dmSection.classList.remove('dm-section--hidden');
    dmHistory.innerHTML = '';

    msgs.forEach(m => {
      // Customer message
      const custBubble = document.createElement('div');
      custBubble.className = 'bubble bubble--user';
      custBubble.innerHTML = `
        <span class="bubble__sender">You</span>
        <p>${m.customerMessage}</p>
      `;
      dmHistory.appendChild(custBubble);

      // Reply or awaiting
      if (m.agentReply) {
        const replyBubble = document.createElement('div');
        replyBubble.className = 'bubble bubble--agent';
        replyBubble.innerHTML = `
          <span class="bubble__sender">${businessName}</span>
          <p>${m.agentReply}</p>
          <span class="dm-status dm-status--replied">Replied ✓</span>
        `;
        dmHistory.appendChild(replyBubble);
      } else {
        const awaitTag = document.createElement('div');
        awaitTag.className = 'dm-awaiting-tag';
        awaitTag.textContent = '⏳ Awaiting reply…';
        dmHistory.appendChild(awaitTag);
      }
    });

    dmHistory.scrollTo({ top: dmHistory.scrollHeight, behavior: 'smooth' });
  }

  // ── Poll for replies every 5 seconds ────────────────────────────────────
  let lastReplyCount = 0;

  function countReplies() {
    return JSON.parse(localStorage.getItem('pendingMessages') || '[]')
      .filter(m => m.businessPhone === businessPhone && m.status === 'replied').length;
  }

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
    } catch (e) { /* ignore */ }
  }

  if (businessPhone) {
    lastReplyCount = countReplies();
    renderDMHistory(); // load existing DMs on page load

    setInterval(() => {
      const newCount = countReplies();
      if (newCount > lastReplyCount) {
        // New reply received!
        playNotificationSound();
        renderDMHistory();

        // Toast
        toast.textContent = `${businessName} has replied! 💬`;
        toast.classList.add('toast--visible');
        setTimeout(() => toast.classList.remove('toast--visible'), 3000);
      }
      lastReplyCount = newCount;
    }, 5000);
  }

});
