/* ─── SIP MANAGER MODULE ───────────────────────────────────────── */

function renderSIP(container) {
  // Refresh SIP statuses
  refreshSIPDates();

  const activeSIPs = DB.sips.filter(s => s.status === 'active');
  const pausedSIPs = DB.sips.filter(s => s.status === 'paused');
  const missedSIPs = DB.sips.filter(s => s.missedCount > 0);
  const totalMonthly = activeSIPs.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const totalInstalled = DB.sips.reduce((s, x) => s + (parseFloat(x.totalInstalled) || 0), 0);

  // Upcoming (within 7 days)
  const upcomingSIPs = activeSIPs.filter(s => {
    if (!s.nextDate) return false;
    const days = daysBetween(today(), s.nextDate);
    return days >= 0 && days <= 7;
  }).sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">SIP <span>Manager</span></h1>
        <p class="page-subtitle">Systematic Investment Plan tracking</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openManualSIPModal()">+ Add SIP</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Active SIPs</div>
        <div class="stat-value">${activeSIPs.length}</div>
        <div class="stat-change">${pausedSIPs.length} paused</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Monthly Outflow</div>
        <div class="stat-value">${formatCurrency(totalMonthly, true)}</div>
        <div class="stat-change">Per month</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Invested</div>
        <div class="stat-value">${formatCurrency(totalInstalled, true)}</div>
        <div class="stat-change">Via SIPs</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Missed SIPs</div>
        <div class="stat-value ${missedSIPs.length ? 'text-danger' : ''}">${missedSIPs.reduce((s, x) => s + (x.missedCount || 0), 0)}</div>
        <div class="stat-change">Total missed</div>
      </div>
    </div>

    ${upcomingSIPs.length ? `
    <div class="card" style="border-left:4px solid var(--accent-light);margin-bottom:24px">
      <div class="section-title" style="color:var(--accent)">📅 Upcoming SIPs (Next 7 Days)</div>
      ${upcomingSIPs.map(s => {
        const days = daysBetween(today(), s.nextDate);
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600">${escHtml(s.schemeName)}</div>
            <div class="text-muted" style="font-size:0.78rem">${s.frequency} · Due: ${formatDate(s.nextDate)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="mono" style="font-weight:700">${formatCurrency(s.amount)}</div>
            <span class="badge ${days === 0 ? 'badge-red' : 'badge-yellow'}">${days === 0 ? 'Today' : `${days}d`}</span>
            <button class="btn btn-primary btn-sm" onclick="markSIPPaid('${s.id}')">✓ Paid</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Tab bar -->
    <div class="tab-bar" id="sip-tab-bar">
      <button class="tab-btn active" onclick="setSIPTab(this,'all')">All SIPs</button>
      <button class="tab-btn" onclick="setSIPTab(this,'active')">Active</button>
      <button class="tab-btn" onclick="setSIPTab(this,'paused')">Paused</button>
      <button class="tab-btn" onclick="setSIPTab(this,'missed')">Missed</button>
    </div>

    <div id="sip-list" style="display:flex;flex-direction:column;gap:12px">
      ${renderSIPCards(DB.sips)}
    </div>
  `;
}

function setSIPTab(el, filter) {
  document.querySelectorAll('#sip-tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  let list;
  if (filter === 'all') list = DB.sips;
  else if (filter === 'missed') list = DB.sips.filter(s => (s.missedCount || 0) > 0);
  else list = DB.sips.filter(s => s.status === filter);
  document.getElementById('sip-list').innerHTML = renderSIPCards(list);
}

function renderSIPCards(sips) {
  if (!sips.length) return `
    <div class="empty-state">
      <div class="empty-icon">🔄</div>
      <h3>No SIPs found</h3>
      <p>SIPs are auto-created when you add a Mutual Fund with SIP mode. You can also add manually.</p>
      <button class="btn btn-primary" onclick="openManualSIPModal()">+ Add SIP</button>
    </div>
  `;
  return sips.map(s => {
    const linked = s.investmentId ? DB.investments.find(i => i.id === s.investmentId) : null;
    const statusColor = { active: 'var(--accent-light)', paused: 'var(--warning)', stopped: 'var(--danger)' };
    const expectedReturn = linked?.expectedReturn || 12;
    const months = Calc.monthsElapsed(s.startDate);
    const fv = Calc.sipFV(parseFloat(s.amount) || 0, expectedReturn, months);
    const invested = (parseFloat(s.amount) || 0) * months;

    return `
      <div class="sip-card">
        <div class="sip-indicator ${s.status}" title="${s.status}"></div>
        <div class="sip-details">
          <div class="sip-name">${escHtml(s.schemeName)}</div>
          <div class="sip-meta">
            ${s.frequency} · ${s.accountId ? getAccountName(s.accountId) : 'No account'} · Started ${formatDate(s.startDate)}
            ${s.missedCount ? `<span class="badge badge-red" style="margin-left:6px">${s.missedCount} missed</span>` : ''}
          </div>
          ${months > 0 ? `<div style="margin-top:6px;font-size:0.78rem;color:var(--text2)">
            Invested: <strong>${formatCurrency(invested, true)}</strong> · 
            Est. Value: <strong class="text-accent">${formatCurrency(fv, true)}</strong>
          </div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="sip-amount">${formatCurrency(s.amount)}</div>
          <div class="text-muted" style="font-size:0.72rem">Next: ${formatDate(s.nextDate)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${s.status === 'active' ? `
            <button class="btn btn-secondary btn-sm" onclick="pauseSIP('${s.id}')">⏸ Pause</button>
            <button class="btn btn-primary btn-sm" onclick="markSIPPaid('${s.id}')">✓ Mark Paid</button>
          ` : ''}
          ${s.status === 'paused' ? `
            <button class="btn btn-primary btn-sm" onclick="resumeSIP('${s.id}')">▶ Resume</button>
          ` : ''}
          <button class="btn-ghost btn-sm" onclick="openSIPDetails('${s.id}')">📋</button>
          <button class="btn-ghost btn-sm text-danger" onclick="deleteSIP('${s.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function refreshSIPDates() {
  const today_str = today();
  DB.sips.forEach(s => {
    if (s.status !== 'active') return;
    if (!s.nextDate) return;
    // Check if next date has passed
    if (s.nextDate < today_str) {
      // Mark as missed if more than 5 days past due
      const daysPast = daysBetween(s.nextDate, today_str);
      if (daysPast > 5) {
        s.missedCount = (s.missedCount || 0) + 1;
      }
      // Advance to next date
      s.nextDate = getNextSIPDate(s.nextDate || today_str, s.sipDay || 1);
    }
  });
}

function pauseSIP(id) {
  const sip = DB.sips.find(s => s.id === id);
  if (!sip) return;
  sip.status = 'paused';
  sip.pausedAt = today();
  saveDB();
  showToast('SIP paused', 'warning');
  renderPage('sip');
}

function resumeSIP(id) {
  const sip = DB.sips.find(s => s.id === id);
  if (!sip) return;
  sip.status = 'active';
  sip.resumedAt = today();
  sip.nextDate = getNextSIPDate(today(), sip.sipDay || 1);
  saveDB();
  showToast('SIP resumed!', 'success');
  renderPage('sip');
}

function markSIPPaid(id) {
  const sip = DB.sips.find(s => s.id === id);
  if (!sip) return;
  const amount = parseFloat(sip.amount) || 0;

  // Deduct from account
  if (sip.accountId) {
    const acc = DB.accounts.find(a => a.id === sip.accountId);
    if (acc) {
      acc.balance = (parseFloat(acc.balance) || 0) - amount;
      addLedgerEntry(acc.id, { type: 'SIP', description: `SIP: ${sip.schemeName}`, amount, credit: false });
    }
  }

  // Add to investment ledger
  if (sip.investmentId) {
    addLedgerEntry(sip.investmentId, { type: 'SIP Instalment', description: `SIP instalment — ${formatDate(sip.nextDate)}`, amount, credit: true });
  }

  sip.totalInstalled = (parseFloat(sip.totalInstalled) || 0) + amount;
  sip.lastPaid = today();
  sip.nextDate = getNextSIPDate(sip.nextDate, sip.sipDay || 1);
  sip.missedCount = Math.max(0, (sip.missedCount || 0) - 1);

  saveDB();
  showToast('SIP marked as paid!', 'success');
  renderPage('sip');
}

function deleteSIP(id) {
  if (!confirm('Delete this SIP? The linked investment will not be deleted.')) return;
  DB.sips = DB.sips.filter(s => s.id !== id);
  saveDB();
  showToast('SIP deleted', 'success');
  renderPage('sip');
}

function openSIPDetails(id) {
  const sip = DB.sips.find(s => s.id === id);
  if (!sip) return;
  const months = Calc.monthsElapsed(sip.startDate);
  const invested = (parseFloat(sip.amount) || 0) * months;
  const fv12 = Calc.sipFV(parseFloat(sip.amount)||0, 12, months);
  const fv15 = Calc.sipFV(parseFloat(sip.amount)||0, 15, months);

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:14px"><div class="stat-label">SIP Amount</div><div class="stat-value" style="font-size:1.2rem">${formatCurrency(sip.amount)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Frequency</div><div class="stat-value" style="font-size:1.2rem">${sip.frequency}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Total Invested</div><div class="stat-value text-accent" style="font-size:1.2rem">${formatCurrency(invested, true)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Months Running</div><div class="stat-value" style="font-size:1.2rem">${months}</div></div>
    </div>
    <div class="calc-box">
      📊 Projected Value at 12% returns: <strong>${formatCurrency(fv12, true)}</strong> &nbsp;|&nbsp;
      At 15%: <strong>${formatCurrency(fv15, true)}</strong>
    </div>
    <div style="margin-top:16px;font-size:0.85rem;color:var(--text2)">
      <div>Started: ${formatDate(sip.startDate)}</div>
      <div>Next Due: ${formatDate(sip.nextDate)}</div>
      <div>Last Paid: ${sip.lastPaid ? formatDate(sip.lastPaid) : 'Never'}</div>
      <div>Missed: ${sip.missedCount || 0}</div>
      <div>Status: <span class="badge ${sip.status==='active'?'badge-green':sip.status==='paused'?'badge-yellow':'badge-red'}">${sip.status}</span></div>
    </div>
  `;
  openModal(`🔄 ${sip.schemeName}`, html);
}

function openManualSIPModal() {
  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Scheme Name *</label>
        <input class="form-input" id="msip-scheme" placeholder="e.g. Mirae Asset ELSS Fund">
      </div>
      <div class="form-row">
        <label class="form-label">SIP Amount (₹) *</label>
        <input class="form-input" id="msip-amount" type="number" placeholder="5000">
      </div>
      <div class="form-row">
        <label class="form-label">Frequency *</label>
        <select class="form-select" id="msip-freq">
          <option>Monthly</option><option>Weekly</option><option>Fortnightly (15 days)</option><option>Daily</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">SIP Day (1-28)</label>
        <input class="form-input" id="msip-day" type="number" min="1" max="28" placeholder="1" value="1">
      </div>
      <div class="form-row">
        <label class="form-label">Start Date *</label>
        <input type="date" class="form-input" id="msip-start" value="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">Linked Account</label>
        <select class="form-select" id="msip-account">${accountOptions()}</select>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveManualSIP()">Create SIP</button>
    </div>
  `;
  openModal('Add SIP Manually', html);
}

function saveManualSIP() {
  const schemeName = getVal('msip-scheme');
  const amount = parseFloat(getVal('msip-amount'));
  const startDate = getVal('msip-start');
  const sipDay = parseInt(getVal('msip-day')) || 1;

  if (!schemeName) return showToast('Scheme name required', 'error');
  if (!amount || amount <= 0) return showToast('Enter valid SIP amount', 'error');
  if (!startDate) return showToast('Start date required', 'error');

  const sip = {
    id: uid(),
    investmentId: null,
    schemeName, amount,
    frequency: getVal('msip-freq') || 'Monthly',
    sipDay,
    accountId: getVal('msip-account'),
    startDate,
    nextDate: getNextSIPDate(startDate, sipDay),
    status: 'active',
    totalInstalled: 0,
    missedCount: 0,
  };
  DB.sips.push(sip);
  saveDB();
  closeModal();
  showToast('SIP created!', 'success');
  renderPage('sip');
}