// app.js – logic for create.html (Create Agent page)

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = JSON.parse(localStorage.getItem('echoSession') || 'null');
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  // ── Show user greeting in navbar ───────────────────────────────────────────
  const navGreeting = document.getElementById('navUserGreeting');
  if (navGreeting) navGreeting.textContent = `👋 ${session.name}`;

  // ── Logout button ──────────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('echoSession');
      window.location.href = 'index.html';
    });
  }

  // ── Phone number cleaner (same logic used by customer search) ──────────────
  function cleanPhone(raw) {
    let cleaned = raw.replace(/[\s\-().\u2013\u2014]/g, '');
    cleaned = cleaned.replace(/^(\+91|091|0)/, '');
    return cleaned;
  }

  // ── Dynamic FAQ builder ────────────────────────────────────────────────────
  const faqList   = document.getElementById('faqList');
  const addFaqBtn = document.getElementById('addFaqBtn');
  let faqCounter  = 0;

  function createFaqBlock(qVal = '', aVal = '') {
    faqCounter++;

    const fieldset = document.createElement('fieldset');
    fieldset.className   = 'faq-block';
    fieldset.dataset.faqId = faqCounter;

    fieldset.innerHTML = `
      <div class="faq-block__header">
        <legend class="faq-block__legend">FAQ <span class="faq-num">${document.querySelectorAll('.faq-block').length + 1}</span></legend>
        <button type="button" class="faq-block__remove" aria-label="Remove this FAQ">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Question</label>
        <input class="form-input faq-q" type="text" placeholder="e.g. Do you accept walk-ins?" value="${qVal}">
      </div>
      <div class="form-group">
        <label class="form-label">Answer</label>
        <input class="form-input faq-a" type="text" placeholder="e.g. Yes, walk-ins welcome until 5 pm." value="${aVal}">
      </div>
    `;

    fieldset.querySelector('.faq-block__remove').addEventListener('click', () => {
      fieldset.style.animation = 'fadeOut 0.25s ease forwards';
      setTimeout(() => {
        fieldset.remove();
        renumberFaqs();
      }, 230);
    });

    return fieldset;
  }

  function renumberFaqs() {
    document.querySelectorAll('.faq-block').forEach((block, i) => {
      const numEl = block.querySelector('.faq-num');
      if (numEl) numEl.textContent = i + 1;
    });
  }

  // Add FAQ button
  if (addFaqBtn && faqList) {
    addFaqBtn.addEventListener('click', () => {
      const block = createFaqBlock();
      block.style.opacity   = '0';
      block.style.transform = 'translateY(16px)';
      faqList.appendChild(block);
      requestAnimationFrame(() => {
        block.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        block.style.opacity    = '1';
        block.style.transform  = 'translateY(0)';
        block.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // Start with 1 FAQ block
    faqList.appendChild(createFaqBlock());
  }

  // ── Demo Mode data — Meera's Salon ────────────────────────────────────────
  const DEMO_DATA = {
    businessName:  "Meera's Salon",
    businessPhone: '9876543210',
    agentName:     'Meera',
    businessDesc:  "We are a premium unisex salon offering haircuts, hair coloring, keratin treatment, facials, waxing, nail art, and bridal makeup. We use top international brands and have 8 skilled stylists.",
    businessHours: 'Monday to Sunday, 10 am to 8 pm',
    faqs: [
      { q: 'Do I need an appointment?',     a: 'Walk-ins are welcome but we recommend booking in advance to avoid waiting.' },
      { q: 'What are your prices?',          a: 'Haircuts start at ₹299, hair coloring from ₹799, and facials from ₹499.' },
      { q: 'Do you offer bridal packages?', a: 'Yes! Bridal packages from ₹4999 include makeup, hair styling, and mehendi.' },
      { q: 'Is parking available?',          a: 'Yes, free parking is available right outside the salon.' },
      { q: 'Do you accept UPI?',             a: 'Yes, we accept cash, all major cards, UPI, and Paytm.' },
    ],
  };

  function fillDemoData() {
    document.getElementById('businessName').value  = DEMO_DATA.businessName;
    document.getElementById('businessPhone').value = DEMO_DATA.businessPhone;
    document.getElementById('agentName').value     = DEMO_DATA.agentName;
    document.getElementById('businessDesc').value  = DEMO_DATA.businessDesc;
    document.getElementById('businessHours').value = DEMO_DATA.businessHours;

    // Clear existing FAQs and refill
    faqList.innerHTML = '';
    faqCounter = 0;
    DEMO_DATA.faqs.forEach(faq => {
      faqList.appendChild(createFaqBlock(faq.q, faq.a));
    });

    // Flash border
    const form = document.getElementById('agentForm');
    if (form) {
      form.style.transition = 'box-shadow 0.3s ease';
      form.style.boxShadow  = '0 0 0 2px rgba(0,255,136,0.4)';
      setTimeout(() => { form.style.boxShadow = ''; }, 1400);
    }
  }

  // Auto-fill if ?demo=true
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') setTimeout(fillDemoData, 150);

  // Demo fill button
  const demoFillBtn = document.getElementById('demoFillBtn');
  if (demoFillBtn) demoFillBtn.addEventListener('click', fillDemoData);

  // ── Form submission ───────────────────────────────────────────────────────
  const form = document.getElementById('agentForm');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const businessName  = document.getElementById('businessName').value.trim();
      const businessPhone = document.getElementById('businessPhone').value.trim();
      const agentName     = document.getElementById('agentName').value.trim();
      const businessDesc  = document.getElementById('businessDesc').value.trim();
      const businessHours = document.getElementById('businessHours').value.trim();

      // Collect all dynamic FAQ blocks
      const faqs = [];
      document.querySelectorAll('#faqList .faq-block').forEach(block => {
        const question = block.querySelector('.faq-q')?.value.trim() || '';
        const answer   = block.querySelector('.faq-a')?.value.trim() || '';
        if (question || answer) faqs.push({ question, answer });
      });

      // Validate required fields
      clearError();
      if (!businessName || !agentName || !businessPhone) {
        showError('Please fill in Business Name, Phone Number, and Agent Name.');
        return;
      }

      const phone = cleanPhone(businessPhone);
      if (phone.length < 5) {
        showError('Please enter a valid phone number.');
        return;
      }

      // Build config
      const agentConfig = {
        businessName,
        agentName,
        businessDescription: businessDesc,
        businessHours,
        businessPhone: phone,
        faqs,
      };

      // 1. Save as active agent config
      localStorage.setItem('agentConfig', JSON.stringify(agentConfig));

      // 1b. Mark user as owner so edit button is visible
      localStorage.setItem('userRole', 'owner');

      // 2. Save to business registry keyed by phone number
      const registry = JSON.parse(localStorage.getItem('businessRegistry') || '{}');
      registry[phone] = agentConfig;
      localStorage.setItem('businessRegistry', JSON.stringify(registry));

      // 3. Show success screen instead of redirecting
      showSuccessScreen(agentName, businessName, phone);
    });
  }

  // ── Success screen ────────────────────────────────────────────────────────
  function showSuccessScreen(agentName, businessName, phone) {
    const formSection   = document.getElementById('createAgent');
    const successScreen = document.getElementById('successScreen');
    const successDesc   = document.getElementById('successDesc');
    const phoneBox      = document.getElementById('successPhoneBox');

    if (!formSection || !successScreen) return;

    // Populate success content
    successDesc.textContent = `${agentName} is ready to take calls for ${businessName}!`;
    phoneBox.innerHTML = `
      <p class="success-card__phone-label">Customers can find you by searching your phone number:</p>
      <div class="success-card__phone-number">📞 ${phone}</div>
    `;

    // Hide form, show success
    formSection.style.display = 'none';
    successScreen.classList.remove('success-screen--hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Error helpers ─────────────────────────────────────────────────────────
  function showError(message) {
    clearError();
    const err = document.createElement('p');
    err.id            = 'formError';
    err.textContent   = message;
    err.style.cssText = [
      'color:#ff4d6d',
      'background:rgba(255,77,109,0.1)',
      'border:1px solid rgba(255,77,109,0.35)',
      'border-radius:10px',
      'padding:12px 16px',
      'font-size:0.9rem',
      'font-weight:500',
      'margin-top:-8px',
      'animation:shake 0.35s ease',
    ].join(';');
    document.getElementById('createAgentBtn').insertAdjacentElement('beforebegin', err);
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    document.getElementById('formError')?.remove();
  }

});
