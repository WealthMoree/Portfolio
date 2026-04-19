/* ─── INSURANCE MODULE ─────────────────────────────────────────── */

const INS_TYPES = ['Term Life', 'Health', 'Car', 'Bike', 'Home', 'Travel', 'Endowment', 'ULIP', 'Other'];
const COMPANY_LOGOS = {
  'LIC': '🏛️', 'HDFC Life': '🔵', 'ICICI Prudential': '🟤', 'SBI Life': '🏦',
  'Max Life': '⚡', 'Bajaj Allianz': '🟠', 'Tata AIA': '⭐', 'Religare': '🏥',
  'Star Health': '⭐', 'Niva Bupa': '💙', 'New India': '🏢', 'United India': '🌐',
};

function renderInsurance(container) {
  const totalPremium = DB.insurance.reduce((s, ins) => s + (parseFloat(ins.premium) || 0), 0);
  const totalCoverage = DB.insurance.reduce((s, ins) => s + (parseFloat(ins.coverage) || 0), 0);
  const upcoming = DB.insurance.filter(ins => {
    if (!ins.renewalDate) return false;
    const days = daysBetween(today(), ins.renewalDate);
    return days >= 0 && days <= 30;
  });

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Insurance & <span>Policies</span></h1>
        <p class="page-subtitle">All your protection plans in one place</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddInsuranceModal()">+ Add Policy</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Annual Premium</div>
        <div class="stat-value">${formatCurrency(totalPremium, true)}</div>
        <div class="stat-change">${DB.insurance.length} policies</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Coverage</div>
        <div class="stat-value">${formatCurrency(totalCoverage, true)}</div>
        <div class="stat-change">Sum assured</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Renewals Due (30 days)</div>
        <div class="stat-value ${upcoming.length ? 'text-warning' : ''}">${upcoming.length}</div>
        <div class="stat-change">${upcoming.length ? 'Action needed' : 'All good'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Monthly Premium</div>
        <div class="stat-value">${formatCurrency(totalPremium / 12, true)}</div>
        <div class="stat-change">Avg per month</div>
      </div>
    </div>

    ${upcoming.length ? `
    <div class="card" style="border-left:4px solid var(--warning);margin-bottom:24px;background:var(--warning-muted)">
      <div class="section-title" style="color:#92400e">⚠️ Upcoming Renewals</div>
      ${upcoming.map(ins => {
        const days = daysBetween(today(), ins.renewalDate);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <div><strong>${escHtml(ins.name)}</strong> <span class="text-muted" style="font-size:0.78rem">— ${escHtml(ins.company)}</span></div>
          <span class="badge badge-yellow">${days === 0 ? 'Today!' : `${days} days`}</span>
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="two-col" style="margin-bottom:24px">
      <div class="chart-wrap">
        <div class="chart-title">Coverage by Type</div>
        <div id="ins-donut"></div>
      </div>
      <div class="chart-wrap">
        <div class="chart-title">Premium by Type</div>
        <div id="ins-premium-chart"></div>
      </div>
    </div>

    <div class="section-title">All Policies (${DB.insurance.length})</div>
    <div class="inv-grid" id="ins-cards">
      ${renderInsuranceCards()}
    </div>
  `;

  // Charts
  const coverageByType = {};
  const premiumByType = {};
  DB.insurance.forEach(ins => {
    coverageByType[ins.type] = (coverageByType[ins.type] || 0) + (parseFloat(ins.coverage) || 0);
    premiumByType[ins.type] = (premiumByType[ins.type] || 0) + (parseFloat(ins.premium) || 0);
  });
  renderDonutChart(document.getElementById('ins-donut'), Object.entries(coverageByType).map(([k, v]) => ({ label: k, value: v })));
  renderBarChart(document.getElementById('ins-premium-chart'), Object.entries(premiumByType).map(([k, v]) => ({ label: k.slice(0, 6), value: v })));
}

function renderInsuranceCards() {
  if (!DB.insurance.length) return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🛡</div>
      <h3>No policies added</h3>
      <p>Add your insurance policies to track premiums, coverage, and renewal dates</p>
      <button class="btn btn-primary" onclick="openAddInsuranceModal()">+ Add Policy</button>
    </div>
  `;
  return DB.insurance.map(ins => {
    const days = ins.renewalDate ? daysBetween(today(), ins.renewalDate) : null;
    const logo = COMPANY_LOGOS[ins.company] || '🏢';
    const isExpiring = days !== null && days >= 0 && days <= 30;
    const isExpired = days !== null && days < 0;

    return `
      <div class="inv-card" onclick="openInsuranceLedger('${ins.id}')">
        <div class="inv-card-header">
          <span style="font-size:1.5rem">${logo}</span>
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            ${isExpiring ? '<span class="badge badge-yellow">⚠ Renew Soon</span>' : ''}
            ${isExpired ? '<span class="badge badge-red">Expired</span>' : ''}
            <button class="btn-icon btn-sm" onclick="editInsurance('${ins.id}')">✏️</button>
            <button class="btn-icon btn-sm" onclick="deleteInsurance('${ins.id}')">🗑️</button>
          </div>
        </div>
        <div class="inv-name">${escHtml(ins.name)}</div>
        <div class="text-muted" style="font-size:0.8rem;margin-bottom:8px">${escHtml(ins.company)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <span class="badge badge-blue">${escHtml(ins.type)}</span>
        </div>
        <div class="inv-meta">
          <div class="inv-meta-item">
            <span class="label">Premium</span>
            <span class="value">${formatCurrency(ins.premium)}</span>
          </div>
          <div class="inv-meta-item">
            <span class="label">Coverage</span>
            <span class="value">${formatCurrency(ins.coverage, true)}</span>
          </div>
          <div class="inv-meta-item">
            <span class="label">Renewal</span>
            <span class="value ${isExpiring ? 'text-warning' : ''}">${formatDate(ins.renewalDate)}</span>
          </div>
          ${ins.policyNumber ? `<div class="inv-meta-item">
            <span class="label">Policy No.</span>
            <span class="value mono" style="font-size:0.75rem">${escHtml(ins.policyNumber)}</span>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openAddInsuranceModal(editId) {
  const ins = editId ? DB.insurance.find(i => i.id === editId) : null;
  const v = (f) => escHtml(ins?.[f] || '');

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Policy Name *</label>
        <input class="form-input" id="ins-name" placeholder="e.g. HDFC Term Plan" value="${v('name')}">
      </div>
      <div class="form-row">
        <label class="form-label">Type *</label>
        <select class="form-select" id="ins-type">
          ${INS_TYPES.map(t => `<option value="${t}" ${ins?.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Company *</label>
        <input class="form-input" id="ins-company" list="company-list" value="${v('company')}">
        <datalist id="company-list">
          ${Object.keys(COMPANY_LOGOS).map(c => `<option value="${c}">`).join('')}
        </datalist>
      </div>
      <div class="form-row">
        <label class="form-label">Policy Number</label>
        <input class="form-input" id="ins-policy-no" value="${v('policyNumber')}">
      </div>
      <div class="form-row">
        <label class="form-label">Annual Premium (₹) *</label>
        <input class="form-input" id="ins-premium" type="number" value="${v('premium')}">
      </div>
      <div class="form-row">
        <label class="form-label">Sum Assured / Coverage (₹)</label>
        <input class="form-input" id="ins-coverage" type="number" value="${v('coverage')}">
      </div>
      <div class="form-row">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-input" id="ins-start" value="${v('startDate') || today()}">
      </div>
      <div class="form-row">
        <label class="form-label">Renewal / Expiry Date</label>
        <input type="date" class="form-input" id="ins-renewal" value="${v('renewalDate')}">
      </div>
      <div class="form-row">
        <label class="form-label">Maturity Date (if applicable)</label>
        <input type="date" class="form-input" id="ins-maturity" value="${v('maturityDate')}">
      </div>
      <div class="form-row">
        <label class="form-label">Payment Frequency</label>
        <select class="form-select" id="ins-freq">
          ${['Monthly','Quarterly','Half-Yearly','Yearly','Single'].map(f => `<option value="${f}" ${ins?.frequency===f?'selected':''}>${f}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Lock-in (years)</label>
        <input class="form-input" id="ins-lockin" type="number" value="${v('lockIn')}">
      </div>
      <div class="form-row">
        <label class="form-label">Maturity Payout</label>
        <select class="form-select" id="ins-payout">
          <option value="">—</option>
          ${['Lumpsum','Yearly Payout','Monthly Payout'].map(p => `<option value="${p}" ${ins?.maturityPayout===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-row full">
        <label class="form-label">Notes</label>
        <input class="form-input" id="ins-notes" value="${v('notes')}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveInsurance('${editId||''}')">${ins ? 'Update' : 'Add'} Policy</button>
    </div>
  `;
  openModal(ins ? 'Edit Policy' : 'Add Insurance / Policy', html);
}

function saveInsurance(editId) {
  const name = getVal('ins-name');
  const premium = parseFloat(getVal('ins-premium'));
  const company = getVal('ins-company');
  if (!name) return showToast('Policy name required', 'error');
  if (!premium || premium <= 0) return showToast('Enter valid premium amount', 'error');

  const ins = {
    id: editId || uid(),
    name, company, premium,
    type: getVal('ins-type'),
    policyNumber: getVal('ins-policy-no'),
    coverage: parseFloat(getVal('ins-coverage')) || 0,
    startDate: getVal('ins-start'),
    renewalDate: getVal('ins-renewal'),
    maturityDate: getVal('ins-maturity'),
    frequency: getVal('ins-freq'),
    lockIn: getVal('ins-lockin'),
    maturityPayout: getVal('ins-payout'),
    notes: getVal('ins-notes'),
  };

  if (editId) {
    const idx = DB.insurance.findIndex(i => i.id === editId);
    if (idx >= 0) DB.insurance[idx] = ins;
  } else {
    DB.insurance.push(ins);
    addLedgerEntry(ins.id, { type: 'Premium', description: `Initial premium: ${name}`, amount: premium, credit: false });
  }

  saveDB();
  closeModal();
  showToast(editId ? 'Policy updated!' : 'Policy added!', 'success');
  renderPage('insurance');
}

function editInsurance(id) { openAddInsuranceModal(id); }

function deleteInsurance(id) {
  if (!confirm('Delete this policy?')) return;
  DB.insurance = DB.insurance.filter(i => i.id !== id);
  delete DB.ledgers[id];
  saveDB();
  showToast('Policy deleted', 'success');
  renderPage('insurance');
}

function openInsuranceLedger(id) {
  const ins = DB.insurance.find(i => i.id === id);
  if (!ins) return;
  const ledger = getLedger(id);
  const totalPaid = ledger.filter(e => !e.credit).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:14px"><div class="stat-label">Annual Premium</div><div class="stat-value" style="font-size:1.1rem">${formatCurrency(ins.premium)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Coverage</div><div class="stat-value" style="font-size:1.1rem">${formatCurrency(ins.coverage, true)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Total Paid</div><div class="stat-value" style="font-size:1.1rem">${formatCurrency(totalPaid)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Next Renewal</div><div class="stat-value" style="font-size:1rem">${formatDate(ins.renewalDate)}</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="ledger-title">Premium Payment History</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="openAddLedgerEntryModal('${id}','${escHtml(ins.name)}')">+ Entry</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLedger('${id}','${escHtml(ins.name)}')">⬇ Export</button>
      </div>
    </div>
    ${ledger.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${ledger.map(e => `
            <tr><td>${formatDate(e.date)}</td><td>${escHtml(e.description)}</td><td class="mono text-danger">−${formatCurrency(e.amount)}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No entries yet</div>'}
  `;
  openModal(`🛡 ${ins.name}`, html);
}