// edit.js – logic for edit.html (Edit Agent page)

document.addEventListener('DOMContentLoaded', () => {

  // ── Security check: only owners can access ──────────────────────────────
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'owner') {
    window.location.href = 'index.html';
    return;
  }

  // ── Auth guard ──────────────────────────────────────────────────────────
  const session = JSON.parse(localStorage.getItem('echoSession') || 'null');
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  // ── User greeting + logout ──────────────────────────────────────────────
  const navGreeting = document.getElementById('navUserGreeting');
  if (navGreeting) navGreeting.textContent = `👋 ${session.name}`;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('echoSession');
      window.location.href = 'index.html';
    });
  }

  // ── Load existing config ────────────────────────────────────────────────
  const raw = localStorage.getItem('agentConfig');
  if (!raw) {
    window.location.href = 'create.html';
    return;
  }

  const config = JSON.parse(raw);

  // ── Phone utility ───────────────────────────────────────────────────────
  function cleanPhone(raw) {
    let cleaned = raw.replace(/[\s\-().\u2013\u2014]/g, '');
    cleaned = cleaned.replace(/^(\+91|091|0)/, '');
    return cleaned;
  }

  // ── Pre-fill form fields ────────────────────────────────────────────────
  const businessNameInput = document.getElementById('editBusinessName');
  const agentNameInput    = document.getElementById('editAgentName');
  const businessDescInput = document.getElementById('editBusinessDesc');
  const businessHoursInput = document.getElementById('editBusinessHours');
  const businessPhoneInput = document.getElementById('editBusinessPhone');

  businessNameInput.value  = config.businessName || '';
  agentNameInput.value     = config.agentName || '';
  businessDescInput.value  = config.businessDescription || '';
  businessHoursInput.value = config.businessHours || '';
  businessPhoneInput.value = config.businessPhone || '';

  // ── Dynamic FAQ builder ─────────────────────────────────────────────────
  const faqList    = document.getElementById('editFaqList');
  const addFaqBtn  = document.getElementById('editAddFaqBtn');
  let faqCounter   = 0;
  const MAX_FAQS   = 10;

  function createFaqBlock(qVal = '', aVal = '') {
    faqCounter++;

    const fieldset = document.createElement('fieldset');
    fieldset.className    = 'faq-block edit-faq-block';
    fieldset.dataset.faqId = faqCounter;

    fieldset.innerHTML = `
      <div class="faq-block__header">
        <legend class="faq-block__legend">FAQ <span class="faq-num">${document.querySelectorAll('#editFaqList .faq-block').length + 1}</span></legend>
        <button type="button" class="faq-block__remove edit-faq-remove" aria-label="Remove this FAQ" title="Remove FAQ">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Question</label>
        <input class="form-input faq-q" type="text" placeholder="e.g. Do you accept walk-ins?" value="${escapeHtml(qVal)}">
      </div>
      <div class="form-group">
        <label class="form-label">Answer</label>
        <input class="form-input faq-a" type="text" placeholder="e.g. Yes, walk-ins welcome until 5 pm." value="${escapeHtml(aVal)}">
      </div>
    `;

    fieldset.querySelector('.faq-block__remove').addEventListener('click', () => {
      fieldset.style.animation = 'fadeOut 0.25s ease forwards';
      setTimeout(() => {
        fieldset.remove();
        renumberFaqs();
        updateAddBtnState();
      }, 230);
    });

    return fieldset;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  function renumberFaqs() {
    document.querySelectorAll('#editFaqList .faq-block').forEach((block, i) => {
      const numEl = block.querySelector('.faq-num');
      if (numEl) numEl.textContent = i + 1;
    });
  }

  function updateAddBtnState() {
    const count = document.querySelectorAll('#editFaqList .faq-block').length;
    if (count >= MAX_FAQS) {
      addFaqBtn.disabled = true;
      addFaqBtn.style.opacity = '0.4';
      addFaqBtn.style.cursor = 'not-allowed';
    } else {
      addFaqBtn.disabled = false;
      addFaqBtn.style.opacity = '1';
      addFaqBtn.style.cursor = 'pointer';
    }
  }

  // Pre-fill existing FAQs
  if (config.faqs && config.faqs.length > 0) {
    config.faqs.forEach(faq => {
      const q = faq.question || faq.q || '';
      const a = faq.answer || faq.a || '';
      faqList.appendChild(createFaqBlock(q, a));
    });
  }
  updateAddBtnState();

  // Add FAQ button
  addFaqBtn.addEventListener('click', () => {
    const count = document.querySelectorAll('#editFaqList .faq-block').length;
    if (count >= MAX_FAQS) return;

    const block = createFaqBlock();
    block.style.opacity   = '0';
    block.style.transform = 'translateY(16px)';
    faqList.appendChild(block);

    requestAnimationFrame(() => {
      block.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      block.style.opacity    = '1';
      block.style.transform  = 'translateY(0)';
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the question input
      const qInput = block.querySelector('.faq-q');
      if (qInput) setTimeout(() => qInput.focus(), 350);
    });

    updateAddBtnState();
  });

  // ── Form submission ─────────────────────────────────────────────────────
  const form = document.getElementById('editForm');
  const toast = document.getElementById('toast');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const businessName  = businessNameInput.value.trim();
    const agentName     = agentNameInput.value.trim();
    const businessDesc  = businessDescInput.value.trim();
    const businessHours = businessHoursInput.value.trim();
    const businessPhone = cleanPhone(businessPhoneInput.value.trim());

    // Validate
    if (!businessName || !agentName) {
      showToast('Business Name and Agent Name are required.', 'error');
      return;
    }

    // Collect FAQs
    const faqs = [];
    document.querySelectorAll('#editFaqList .faq-block').forEach(block => {
      const question = block.querySelector('.faq-q')?.value.trim() || '';
      const answer   = block.querySelector('.faq-a')?.value.trim() || '';
      if (question || answer) faqs.push({ question, answer });
    });

    // Build updated config
    const oldPhone = config.businessPhone || '';
    const updatedConfig = {
      businessName,
      agentName,
      businessDescription: businessDesc,
      businessHours,
      businessPhone,
      faqs,
    };

    // 1. Update agentConfig in localStorage
    localStorage.setItem('agentConfig', JSON.stringify(updatedConfig));

    // 2. Update businessRegistry
    const registry = JSON.parse(localStorage.getItem('businessRegistry') || '{}');

    // Remove old phone entry if phone changed
    if (oldPhone && oldPhone !== businessPhone && registry[oldPhone]) {
      delete registry[oldPhone];
    }

    // Save under current phone
    if (businessPhone) {
      registry[businessPhone] = updatedConfig;
    }

    localStorage.setItem('businessRegistry', JSON.stringify(registry));

    // 3. Show success toast and redirect
    showToast('Agent updated successfully! ✓', 'success');

    setTimeout(() => {
      window.location.href = 'agent.html';
    }, 2000);
  });

  // ── Toast helper ────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.borderColor = 'rgba(255,77,109,0.35)';
      toast.style.boxShadow   = '0 0 24px rgba(255,77,109,0.15), 0 8px 32px rgba(0,0,0,0.5)';
    } else {
      toast.style.borderColor = 'rgba(0,255,136,0.35)';
      toast.style.boxShadow   = '0 0 24px rgba(0,255,136,0.15), 0 8px 32px rgba(0,0,0,0.5)';
    }
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 3000);
  }

});
