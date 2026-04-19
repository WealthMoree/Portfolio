/* ─── INVESTMENTS MODULE ───────────────────────────────────────── */

const INV_TYPES = ['FD', 'Mutual Fund', 'Bonds', 'EPF', 'PPF', 'Stocks', 'Gold', 'Real Estate', 'NPS', 'Other'];

function getInvestmentPrincipal(inv) {
  if (!inv) return 0;
  switch (inv.type) {
    case 'FD': return parseFloat(inv.amount) || 0;
    case 'Mutual Fund':
      if (inv.mode === 'SIP') {
        const months = Calc.monthsElapsed(inv.startDate);
        return (parseFloat(inv.sipAmount) || 0) * months;
      }
      return parseFloat(inv.amount) || 0;
    case 'EPF': return ((parseFloat(inv.employeeShare) || 0) + (parseFloat(inv.employerShare) || 0)) * Calc.monthsElapsed(inv.startDate);
    case 'PPF': return (parseFloat(inv.monthlyContribution) || 0) * Calc.monthsElapsed(inv.startDate);
    case 'Bonds': return parseFloat(inv.amount) || 0;
    default: return parseFloat(inv.amount) || 0;
  }
}

function getInvestmentCurrentValue(inv) {
  if (!inv) return 0;
  const years = Calc.yearsElapsed(inv.startDate);
  const months = Calc.monthsElapsed(inv.startDate);
  switch (inv.type) {
    case 'FD':
      return Calc.fdMaturity(parseFloat(inv.amount) || 0, parseFloat(inv.interestRate) || 0, months);
    case 'Mutual Fund':
      if (inv.mode === 'SIP') {
        const sip = DB.sips.find(s => s.investmentId === inv.id);
        const rate = parseFloat(inv.expectedReturn) || 12;
        return Calc.sipFV(parseFloat(inv.sipAmount) || 0, rate, months);
      }
      const expectedR = parseFloat(inv.expectedReturn) || 12;
      return Calc.compoundAnnual(parseFloat(inv.amount) || 0, expectedR, years);
    case 'EPF': {
      const monthlyTotal = (parseFloat(inv.employeeShare) || 0) + (parseFloat(inv.employerShare) || 0);
      const rate = 8.25;
      return Calc.sipFV(monthlyTotal, rate, months);
    }
    case 'PPF': {
      const pRate = parseFloat(inv.interestRate) || 7.1;
      return Calc.sipFV(parseFloat(inv.monthlyContribution) || 0, pRate, months);
    }
    case 'Bonds': {
      return Calc.bondCurrentValue(parseFloat(inv.amount) || 0, parseFloat(inv.interestRate) || 0, years);
    }
    default:
      return parseFloat(inv.currentValue) || parseFloat(inv.amount) || 0;
  }
}

function getInvestmentMaturityAmount(inv) {
  if (!inv) return 0;
  switch (inv.type) {
    case 'FD':
      return Calc.fdMaturity(parseFloat(inv.amount) || 0, parseFloat(inv.interestRate) || 0, parseFloat(inv.tenureMonths) || 0);
    case 'Bonds':
      const yrs = inv.maturityDate ? daysBetween(inv.startDate, inv.maturityDate) / 365 : 0;
      return Calc.bondCurrentValue(parseFloat(inv.amount) || 0, parseFloat(inv.interestRate) || 0, yrs);
    default:
      return getInvestmentCurrentValue(inv);
  }
}

// ─── RENDER ──────────────────────────────────────────────────────
function renderInvestments(container) {
  const totalPrincipal = DB.investments.reduce((s, i) => s + getInvestmentPrincipal(i), 0);
  const totalCurrent = DB.investments.reduce((s, i) => s + getInvestmentCurrentValue(i), 0);
  const gainLoss = totalCurrent - totalPrincipal;
  const gainPct = totalPrincipal > 0 ? ((gainLoss / totalPrincipal) * 100).toFixed(2) : 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Investments</h1>
        <p class="page-subtitle">Track, analyse and grow your portfolio</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="openInvSheetModal()">📁 Sheets</button>
        <button class="btn btn-primary" onclick="openAddInvestmentModal()">+ Add Investment</button>
      </div>
    </div>

    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card">
        <div class="stat-label">Invested</div>
        <div class="stat-value">${formatCurrency(totalPrincipal, true)}</div>
        <div class="stat-change">${DB.investments.length} holdings</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current Value</div>
        <div class="stat-value">${formatCurrency(totalCurrent, true)}</div>
        <div class="stat-change ${gainLoss >= 0 ? 'up' : 'down'}">${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss, true)} (${gainPct}%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unrealized P&L</div>
        <div class="stat-value ${gainLoss >= 0 ? 'text-accent' : 'text-danger'}">${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss, true)}</div>
        <div class="stat-change">${gainPct}% returns</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active SIPs</div>
        <div class="stat-value">${DB.sips.filter(s => s.status === 'active').length}</div>
        <div class="stat-change">${formatCurrency(DB.sips.filter(s=>s.status==='active').reduce((s,x)=>s+(parseFloat(x.amount)||0),0), true)}/month</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="two-col" style="margin-bottom:24px">
      <div class="chart-wrap">
        <div class="chart-title">Portfolio Distribution</div>
        <div id="inv-dist-chart"></div>
      </div>
      <div class="chart-wrap">
        <div class="chart-title">Investment vs. Current Value by Type</div>
        <div id="inv-compare-chart"></div>
      </div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center">
      <div class="search-bar" style="flex:1;min-width:200px">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Search investments..." id="inv-search" oninput="filterInvestments()">
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="inv-type-filters">
        <span class="chip active" data-type="all" onclick="setInvFilter(this,'all')">All</span>
        ${INV_TYPES.map(t => `<span class="chip" data-type="${t}" onclick="setInvFilter(this,'${t}')">${t}</span>`).join('')}
      </div>
    </div>

    <!-- Cards -->
    <div class="inv-grid" id="inv-cards-container">
      ${renderInvestmentCards()}
    </div>
  `;

  // Charts
  const byType = {};
  DB.investments.forEach(inv => {
    byType[inv.type] = (byType[inv.type] || 0) + getInvestmentCurrentValue(inv);
  });
  renderDonutChart(document.getElementById('inv-dist-chart'), Object.entries(byType).map(([k, v]) => ({ label: k, value: v })));

  const compareData = Object.keys(byType).map(t => ({
    label: t.slice(0, 4),
    value: DB.investments.filter(i => i.type === t).reduce((s, i) => s + getInvestmentCurrentValue(i), 0)
  }));
  renderBarChart(document.getElementById('inv-compare-chart'), compareData);
}

let invTypeFilter = 'all';

function setInvFilter(el, type) {
  invTypeFilter = type;
  document.querySelectorAll('#inv-type-filters .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterInvestments();
}

function filterInvestments() {
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const list = DB.investments.filter(inv => {
    const matchType = invTypeFilter === 'all' || inv.type === invTypeFilter;
    const matchQ = !q || inv.name?.toLowerCase().includes(q) || inv.type?.toLowerCase().includes(q);
    return matchType && matchQ;
  });
  document.getElementById('inv-cards-container').innerHTML = list.length ? renderInvestmentCards(list) : `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🔍</div>
      <h3>No investments found</h3>
      <p>Try a different search or filter</p>
    </div>
  `;
}

function renderInvestmentCards(list) {
  list = list || DB.investments;
  if (!list.length) return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">📈</div>
      <h3>No investments yet</h3>
      <p>Add your first investment to start tracking your portfolio</p>
      <button class="btn btn-primary" onclick="openAddInvestmentModal()">+ Add Investment</button>
    </div>
  `;
  return list.map(inv => {
    const principal = getInvestmentPrincipal(inv);
    const current = getInvestmentCurrentValue(inv);
    const gain = current - principal;
    const gainPct = principal > 0 ? ((gain / principal) * 100).toFixed(1) : 0;
    const months = Calc.monthsElapsed(inv.startDate);
    const tenure = parseFloat(inv.tenureMonths) || 0;
    const progress = tenure ? Math.min(100, (months / tenure) * 100) : 0;

    const typeColors = {
      'FD': '#f59e0b', 'Mutual Fund': '#3b82f6', 'EPF': '#8b5cf6',
      'PPF': '#22c55e', 'Bonds': '#06b6d4', 'Stocks': '#ef4444',
      'Gold': '#d97706', 'NPS': '#ec4899', 'Other': '#6b7280'
    };
    const color = typeColors[inv.type] || '#6b7280';

    return `
      <div class="inv-card" onclick="openInvLedger('${inv.id}')">
        <div class="inv-card-header">
          <span class="badge" style="background:${color}22;color:${color}">${escHtml(inv.type)}</span>
          <div class="inv-card-actions" onclick="event.stopPropagation()">
            <button class="btn-icon btn-sm" title="Edit" onclick="editInvestment('${inv.id}')">✏️</button>
            <button class="btn-icon btn-sm" title="Export Ledger" onclick="exportLedger('${inv.id}','${escHtml(inv.name)}')">⬇️</button>
            <button class="btn-icon btn-sm" title="Delete" onclick="deleteInvestment('${inv.id}')">🗑️</button>
          </div>
        </div>
        <div class="inv-name">${escHtml(inv.name)}</div>
        ${inv.bankName ? `<div class="text-muted" style="font-size:0.78rem;margin-bottom:6px">${escHtml(inv.bankName)}</div>` : ''}
        <div class="inv-amount">${formatCurrency(current, true)}</div>
        <div class="inv-meta">
          <div class="inv-meta-item">
            <span class="label">Invested</span>
            <span class="value">${formatCurrency(principal, true)}</span>
          </div>
          <div class="inv-meta-item">
            <span class="label">Returns</span>
            <span class="value ${gain >= 0 ? 'text-accent' : 'text-danger'}">${gain >= 0 ? '+' : ''}${gainPct}%</span>
          </div>
          <div class="inv-meta-item">
            <span class="label">Started</span>
            <span class="value">${formatDate(inv.startDate)}</span>
          </div>
          ${inv.maturityDate ? `<div class="inv-meta-item">
            <span class="label">Matures</span>
            <span class="value">${formatDate(inv.maturityDate)}</span>
          </div>` : ''}
        </div>
        ${tenure ? `
          <div class="inv-progress">
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text3);margin-bottom:4px">
              <span>${months}m elapsed</span>
              <span>${tenure}m total</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ─── ADD INVESTMENT MODAL ────────────────────────────────────────
function openAddInvestmentModal(existingId) {
  const inv = existingId ? DB.investments.find(i => i.id === existingId) : null;
  const isEdit = !!inv;

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Investment Type *</label>
        <select class="form-select" id="inv-type" onchange="onInvTypeChange()" ${isEdit ? 'disabled' : ''}>
          <option value="">Select type...</option>
          ${INV_TYPES.map(t => `<option value="${t}" ${inv?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Investment Name *</label>
        <input class="form-input" id="inv-name" placeholder="e.g. HDFC FD, SBI PPF" value="${escHtml(inv?.name || '')}">
      </div>
      <div class="form-row">
        <label class="form-label">Start Date *</label>
        <input type="date" class="form-input" id="inv-start-date" value="${inv?.startDate || today()}" max="${today()}">
      </div>
    </div>
    <div id="inv-dynamic-fields" style="margin-top:16px"></div>
    <div class="form-grid cols-1" style="margin-top:12px">
      <div class="form-row full">
        <label class="form-label">Notes</label>
        <input class="form-input" id="inv-notes" placeholder="Optional notes" value="${escHtml(inv?.notes || '')}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveInvestment('${existingId || ''}')">${isEdit ? 'Update' : 'Add'} Investment</button>
    </div>
  `;

  openModal(isEdit ? 'Edit Investment' : 'Add Investment', html, () => {
    if (inv) onInvTypeChange(inv);
  });
}

function onInvTypeChange(existingInv) {
  const type = document.getElementById('inv-type')?.value || existingInv?.type;
  const container = document.getElementById('inv-dynamic-fields');
  if (!container) return;

  const inv = existingInv;
  const v = (field) => escHtml(inv?.[field] || '');

  const fields = {
    'FD': `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Principal Amount (₹) *</label><input class="form-input" id="inv-amount" type="number" placeholder="100000" value="${v('amount')}" oninput="calcFDPreview()"></div>
        <div class="form-row"><label class="form-label">Interest Rate (% p.a.) *</label><input class="form-input" id="inv-rate" type="number" placeholder="7.5" step="0.01" value="${v('interestRate')}" oninput="calcFDPreview()"></div>
        <div class="form-row"><label class="form-label">Tenure (months) *</label><input class="form-input" id="inv-tenure" type="number" placeholder="24" value="${v('tenureMonths')}" oninput="calcFDPreview()"></div>
        <div class="form-row"><label class="form-label">Maturity Date</label><input type="date" class="form-input" id="inv-maturity-date" value="${v('maturityDate')}"></div>
        <div class="form-row"><label class="form-label">Bank Name</label><input class="form-input" id="inv-bank" placeholder="HDFC Bank" value="${v('bankName')}"></div>
        <div class="form-row"><label class="form-label">Linked Account</label><select class="form-select" id="inv-account">${accountOptions()}</select></div>
        <div id="fd-preview" class="calc-box hidden" style="grid-column:1/-1"></div>
      </div>
    `,
    'Mutual Fund': `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Scheme Name *</label><input class="form-input" id="inv-scheme" placeholder="HDFC Flexi Cap Fund" value="${v('schemeName')}"></div>
        <div class="form-row"><label class="form-label">Mode *</label>
          <select class="form-select" id="inv-mf-mode" onchange="onMFModeChange()">
            <option value="SIP" ${inv?.mode==='SIP'?'selected':''}>SIP</option>
            <option value="Lumpsum" ${inv?.mode==='Lumpsum'?'selected':''}>Lumpsum</option>
          </select>
        </div>
        <div id="mf-mode-fields" style="grid-column:1/-1"></div>
        <div class="form-row"><label class="form-label">Expected Return (% p.a.)</label><input class="form-input" id="inv-expected-return" type="number" placeholder="12" value="${v('expectedReturn')}"></div>
        <div class="form-row"><label class="form-label">FOLIO Number</label><input class="form-input" id="inv-folio" placeholder="Optional" value="${v('folioNumber')}"></div>
      </div>
    `,
    'Bonds': `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Bond Type *</label>
          <select class="form-select" id="inv-bond-type">
            ${['Corporate','Municipal','Sovereign','G-Sec'].map(b => `<option value="${b}" ${inv?.bondType===b?'selected':''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label class="form-label">Face Value (₹) *</label><input class="form-input" id="inv-amount" type="number" value="${v('amount')}"></div>
        <div class="form-row"><label class="form-label">Coupon Rate (% p.a.) *</label><input class="form-input" id="inv-rate" type="number" step="0.01" value="${v('interestRate')}"></div>
        <div class="form-row"><label class="form-label">Maturity Date *</label><input type="date" class="form-input" id="inv-maturity-date" value="${v('maturityDate')}"></div>
        <div class="form-row"><label class="form-label">Interest Payout</label>
          <select class="form-select" id="inv-payout">
            ${['Monthly','Quarterly','Yearly','At Maturity'].map(p => `<option value="${p}" ${inv?.payout===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label class="form-label">ISIN</label><input class="form-input" id="inv-isin" placeholder="Optional" value="${v('isin')}"></div>
      </div>
    `,
    'EPF': `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Employee Monthly Share (₹) *</label><input class="form-input" id="inv-emp-share" type="number" placeholder="1800" value="${v('employeeShare')}"></div>
        <div class="form-row"><label class="form-label">Employer Monthly Share (₹) *</label><input class="form-input" id="inv-emr-share" type="number" placeholder="1800" value="${v('employerShare')}"></div>
        <div class="form-row"><label class="form-label">Interest Rate (% p.a.)</label><input class="form-input" id="inv-rate" type="number" value="8.25" readonly style="opacity:0.7"></div>
        <div class="form-row"><label class="form-label">UAN Number</label><input class="form-input" id="inv-uan" placeholder="Optional" value="${v('uan')}"></div>
        <div class="calc-box" style="grid-column:1/-1">💡 EPF interest is credited at <strong>8.25% p.a.</strong> at the end of each financial year (31 March)</div>
      </div>
    `,
    'PPF': `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Monthly Contribution (₹) *</label><input class="form-input" id="inv-ppf-monthly" type="number" placeholder="12500" value="${v('monthlyContribution')}" oninput="calcPPFPreview()"></div>
        <div class="form-row"><label class="form-label">Interest Rate (% p.a.) *</label><input class="form-input" id="inv-rate" type="number" placeholder="7.1" step="0.01" value="${v('interestRate') || '7.1'}" oninput="calcPPFPreview()"></div>
        <div class="form-row"><label class="form-label">Bank / Post Office</label><input class="form-input" id="inv-bank" placeholder="SBI" value="${v('bankName')}"></div>
        <div class="form-row"><label class="form-label">PPF Account Number</label><input class="form-input" id="inv-ppf-acno" placeholder="Optional" value="${v('ppfAccountNo')}"></div>
        <div class="calc-box" style="grid-column:1/-1">💡 PPF has a 15-year lock-in. Interest compounds annually at financial year end. Max ₹1.5L/year.</div>
        <div id="ppf-preview" style="grid-column:1/-1"></div>
      </div>
    `,
  };

  const defaultFields = `
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Amount (₹) *</label><input class="form-input" id="inv-amount" type="number" placeholder="50000" value="${v('amount')}"></div>
      <div class="form-row"><label class="form-label">Current Value (₹)</label><input class="form-input" id="inv-current-value" type="number" placeholder="Leave blank if same" value="${v('currentValue')}"></div>
      <div class="form-row"><label class="form-label">Linked Account</label><select class="form-select" id="inv-account">${accountOptions()}</select></div>
    </div>
  `;

  container.innerHTML = fields[type] || defaultFields;

  if (type === 'Mutual Fund') {
    setTimeout(() => onMFModeChange(existingInv), 0);
  }
  if (type === 'FD' && inv) setTimeout(calcFDPreview, 0);
}

function onMFModeChange(existingInv) {
  const mode = document.getElementById('inv-mf-mode')?.value;
  const inv = existingInv;
  const v = (f) => escHtml(inv?.[f] || '');
  const container = document.getElementById('mf-mode-fields');
  if (!container) return;

  if (mode === 'SIP') {
    container.innerHTML = `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">SIP Amount (₹) *</label><input class="form-input" id="inv-sip-amount" type="number" placeholder="5000" value="${v('sipAmount')}"></div>
        <div class="form-row"><label class="form-label">Frequency *</label>
          <select class="form-select" id="inv-sip-freq">
            ${['Monthly','Weekly','Fortnightly (15 days)','Daily'].map(f => `<option value="${f}" ${inv?.sipFrequency===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label class="form-label">Linked Account</label><select class="form-select" id="inv-account">${accountOptions()}</select></div>
        <div class="form-row"><label class="form-label">SIP Date (day of month)</label><input class="form-input" id="inv-sip-day" type="number" min="1" max="28" placeholder="1" value="${v('sipDay') || '1'}"></div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Lumpsum Amount (₹) *</label><input class="form-input" id="inv-amount" type="number" placeholder="100000" value="${v('amount')}"></div>
        <div class="form-row"><label class="form-label">Linked Account</label><select class="form-select" id="inv-account">${accountOptions()}</select></div>
      </div>
    `;
  }
}

function calcFDPreview() {
  const amt = parseFloat(document.getElementById('inv-amount')?.value) || 0;
  const rate = parseFloat(document.getElementById('inv-rate')?.value) || 0;
  const tenure = parseFloat(document.getElementById('inv-tenure')?.value) || 0;
  const preview = document.getElementById('fd-preview');
  if (!preview) return;
  if (!amt || !rate || !tenure) { preview.classList.add('hidden'); return; }
  const maturity = Calc.fdMaturity(amt, rate, tenure);
  const interest = maturity - amt;
  preview.classList.remove('hidden');
  preview.innerHTML = `💰 Maturity Amount: <strong>${formatCurrency(maturity)}</strong> &nbsp;|&nbsp; Interest Earned: <strong>${formatCurrency(interest)}</strong> &nbsp;|&nbsp; Effective Yield: <strong>${rate}% p.a.</strong>`;
  // Auto-fill maturity date
  const startDate = document.getElementById('inv-start-date')?.value;
  if (startDate) {
    document.getElementById('inv-maturity-date').value = addMonths(startDate, tenure);
  }
}

function calcPPFPreview() {
  const monthly = parseFloat(document.getElementById('inv-ppf-monthly')?.value) || 0;
  const rate = parseFloat(document.getElementById('inv-rate')?.value) || 7.1;
  const preview = document.getElementById('ppf-preview');
  if (!preview) return;
  if (!monthly) return;
  const fv15 = Calc.sipFV(monthly, rate, 180);
  const invested15 = monthly * 180;
  preview.innerHTML = `<div class="calc-box">📊 At 15 years: Invested <strong>${formatCurrency(invested15, true)}</strong> → Maturity: <strong>${formatCurrency(fv15, true)}</strong></div>`;
}

// ─── SAVE INVESTMENT ─────────────────────────────────────────────
function saveInvestment(editId) {
  const type = document.getElementById('inv-type')?.value;
  const name = document.getElementById('inv-name')?.value?.trim();
  const startDate = document.getElementById('inv-start-date')?.value;

  if (!type) return showToast('Select investment type', 'error');
  if (!name) return showToast('Investment name is required', 'error');
  if (!startDate) return showToast('Start date is required', 'error');

  const base = {
    id: editId || uid(),
    type, name, startDate,
    notes: getVal('inv-notes'),
    accountId: getVal('inv-account'),
    createdAt: editId ? (DB.investments.find(i=>i.id===editId)?.createdAt || today()) : today(),
  };

  let extra = {};
  let createSIP = false;

  try {
    switch (type) {
      case 'FD':
        const fdAmt = parseFloat(getVal('inv-amount'));
        const fdRate = parseFloat(getVal('inv-rate'));
        const fdTenure = parseInt(getVal('inv-tenure'));
        if (!fdAmt || fdAmt <= 0) return showToast('Enter valid principal amount', 'error');
        if (!fdRate || fdRate <= 0) return showToast('Enter valid interest rate', 'error');
        if (!fdTenure || fdTenure <= 0) return showToast('Enter valid tenure', 'error');
        extra = {
          amount: fdAmt, interestRate: fdRate, tenureMonths: fdTenure,
          maturityDate: getVal('inv-maturity-date'),
          bankName: getVal('inv-bank'),
          maturityAmount: Calc.fdMaturity(fdAmt, fdRate, fdTenure),
        };
        break;

      case 'Mutual Fund':
        const mfMode = getVal('inv-mf-mode');
        extra = { mode: mfMode, schemeName: getVal('inv-scheme'), expectedReturn: parseFloat(getVal('inv-expected-return')) || 12, folioNumber: getVal('inv-folio') };
        if (mfMode === 'SIP') {
          const sipAmt = parseFloat(getVal('inv-sip-amount'));
          if (!sipAmt || sipAmt <= 0) return showToast('Enter valid SIP amount', 'error');
          extra.sipAmount = sipAmt;
          extra.sipFrequency = getVal('inv-sip-freq');
          extra.sipDay = parseInt(getVal('inv-sip-day')) || 1;
          createSIP = true;
        } else {
          const lsAmt = parseFloat(getVal('inv-amount'));
          if (!lsAmt || lsAmt <= 0) return showToast('Enter valid lumpsum amount', 'error');
          extra.amount = lsAmt;
        }
        break;

      case 'EPF':
        const empShare = parseFloat(getVal('inv-emp-share'));
        const emrShare = parseFloat(getVal('inv-emr-share'));
        if (!empShare || empShare <= 0) return showToast('Enter employee contribution', 'error');
        extra = { employeeShare: empShare, employerShare: emrShare || 0, interestRate: 8.25, uan: getVal('inv-uan') };
        break;

      case 'PPF':
        const ppfMonthly = parseFloat(getVal('inv-ppf-monthly'));
        const ppfRate = parseFloat(getVal('inv-rate')) || 7.1;
        if (!ppfMonthly || ppfMonthly > 12500) return showToast('PPF monthly contribution must be ≤ ₹12,500 (₹1.5L/year)', 'error');
        extra = { monthlyContribution: ppfMonthly, interestRate: ppfRate, bankName: getVal('inv-bank'), ppfAccountNo: getVal('inv-ppf-acno') };
        break;

      case 'Bonds':
        const bAmt = parseFloat(getVal('inv-amount'));
        const bRate = parseFloat(getVal('inv-rate'));
        if (!bAmt || !bRate) return showToast('Enter bond amount and coupon rate', 'error');
        extra = { amount: bAmt, interestRate: bRate, bondType: getVal('inv-bond-type'), maturityDate: getVal('inv-maturity-date'), payout: getVal('inv-payout'), isin: getVal('inv-isin') };
        break;

      default:
        const defAmt = parseFloat(getVal('inv-amount'));
        if (!defAmt || defAmt <= 0) return showToast('Enter valid amount', 'error');
        extra = { amount: defAmt, currentValue: parseFloat(getVal('inv-current-value')) || defAmt };
    }
  } catch(e) {
    return showToast('Validation error: ' + e.message, 'error');
  }

  const investment = { ...base, ...extra };

  if (editId) {
    const idx = DB.investments.findIndex(i => i.id === editId);
    if (idx >= 0) DB.investments[idx] = investment;
  } else {
    DB.investments.push(investment);
    // Auto-create ledger entry
    addLedgerEntry(investment.id, { type: 'Investment', description: `Initial investment: ${name}`, amount: extra.amount || extra.sipAmount || 0, credit: true });

    // Create linked SIP
    if (createSIP) {
      const sipDay = extra.sipDay || 1;
      const nextDate = getNextSIPDate(startDate, sipDay);
      const sip = {
        id: uid(), investmentId: investment.id,
        schemeName: extra.schemeName || name,
        amount: extra.sipAmount,
        frequency: extra.sipFrequency || 'Monthly',
        sipDay, accountId: base.accountId,
        startDate, nextDate, status: 'active',
        totalInstalled: 0, missedCount: 0,
      };
      DB.sips.push(sip);
    }
  }

  saveDB();
  closeModal();
  showToast(editId ? 'Investment updated!' : 'Investment added!', 'success');
  renderPage('investments');
}

function getNextSIPDate(fromDate, day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d <= now) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

function editInvestment(id) {
  openAddInvestmentModal(id);
}

function deleteInvestment(id) {
  if (!confirm('Delete this investment? This cannot be undone.')) return;
  DB.investments = DB.investments.filter(i => i.id !== id);
  DB.sips = DB.sips.filter(s => s.investmentId !== id);
  delete DB.ledgers[id];
  saveDB();
  showToast('Investment deleted', 'success');
  renderPage('investments');
}

// ─── LEDGER VIEW ─────────────────────────────────────────────────
function openInvLedger(id) {
  const inv = DB.investments.find(i => i.id === id);
  if (!inv) return;
  const ledger = getLedger(id);
  const current = getInvestmentCurrentValue(inv);
  const principal = getInvestmentPrincipal(inv);
  const gain = current - principal;

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:14px">
        <div class="stat-label">Invested</div>
        <div class="stat-value" style="font-size:1.2rem">${formatCurrency(principal)}</div>
      </div>
      <div class="stat-card" style="padding:14px">
        <div class="stat-label">Current Value</div>
        <div class="stat-value" style="font-size:1.2rem">${formatCurrency(current)}</div>
      </div>
      <div class="stat-card" style="padding:14px">
        <div class="stat-label">P&L</div>
        <div class="stat-value ${gain>=0?'text-accent':'text-danger'}" style="font-size:1.2rem">${gain>=0?'+':''}${formatCurrency(gain)}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="ledger-title">Transaction Ledger</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="openAddLedgerEntryModal('${id}','${escHtml(inv.name)}')">+ Entry</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLedger('${id}','${escHtml(inv.name)}')">⬇ Export</button>
      </div>
    </div>
    ${ledger.length ? `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
        <tbody>
          ${ledger.map(e => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${escHtml(e.description)}</td>
              <td class="mono ${e.credit ? 'text-accent' : 'text-danger'}">${e.credit ? '+' : '-'}${formatCurrency(e.amount)}</td>
              <td><span class="badge ${e.credit ? 'badge-green' : 'badge-red'}">${e.type || 'Entry'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No ledger entries yet</div>'}
  `;

  openModal(`📊 ${inv.name}`, html);
}

function openAddLedgerEntryModal(entityId, entityName) {
  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Date *</label>
        <input type="date" class="form-input" id="le-date" value="${today()}" max="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">Entry Type</label>
        <select class="form-select" id="le-type">
          <option>Credit</option><option>Debit</option><option>Dividend</option><option>Interest</option><option>Withdrawal</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-input" id="le-amount" type="number" placeholder="0">
      </div>
      <div class="form-row">
        <label class="form-label">Description</label>
        <input class="form-input" id="le-desc" placeholder="e.g. Monthly SIP instalment">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLedgerEntry('${entityId}','${entityName}')">Add Entry</button>
    </div>
  `;
  openModal(`Add Ledger Entry — ${entityName}`, html);
}

function saveLedgerEntry(entityId, entityName) {
  const date = getVal('le-date');
  const amount = parseFloat(getVal('le-amount'));
  const type = getVal('le-type');
  const description = getVal('le-desc');
  if (!date) return showToast('Date is required', 'error');
  if (!amount || amount <= 0) return showToast('Enter valid amount', 'error');
  const credit = ['Credit','Dividend','Interest'].includes(type);
  addLedgerEntry(entityId, { date, amount, type, description: description || type, credit });
  showToast('Ledger entry added!', 'success');
  closeModal();
  openInvLedger(entityId);
}

// ─── INVESTMENT SHEETS ───────────────────────────────────────────
function openInvSheetModal() {
  const html = `
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input class="form-input" id="new-sheet-name" placeholder="New sheet name (e.g. Retirement Fund)" style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="addInvSheet()">Create</button>
      </div>
      ${DB.sheets.length ? DB.sheets.map(sheet => `
        <div class="card" style="margin-bottom:10px;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong>${escHtml(sheet.name)}</strong>
            <button class="btn-ghost btn-sm" onclick="deleteSheet('${sheet.id}')">🗑️</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${DB.investments.map(inv => `
              <span class="chip ${(sheet.investmentIds||[]).includes(inv.id)?'active':''}" onclick="toggleSheetInv('${sheet.id}','${inv.id}',this)">
                ${escHtml(inv.name)}
              </span>
            `).join('')}
          </div>
        </div>
      `).join('') : '<div class="text-muted">No sheets yet. Create one above.</div>'}
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Done</button></div>
  `;
  openModal('Investment Sheets', html);
}

function addInvSheet() {
  const name = getVal('new-sheet-name');
  if (!name) return showToast('Enter sheet name', 'error');
  if (DB.sheets.find(s => s.name.toLowerCase() === name.toLowerCase())) return showToast('Sheet already exists', 'error');
  DB.sheets.push({ id: uid(), name, investmentIds: [] });
  saveDB();
  openInvSheetModal();
}

function toggleSheetInv(sheetId, invId, el) {
  const sheet = DB.sheets.find(s => s.id === sheetId);
  if (!sheet) return;
  sheet.investmentIds = sheet.investmentIds || [];
  const idx = sheet.investmentIds.indexOf(invId);
  if (idx >= 0) { sheet.investmentIds.splice(idx, 1); el.classList.remove('active'); }
  else { sheet.investmentIds.push(invId); el.classList.add('active'); }
  saveDB();
}

function deleteSheet(id) {
  DB.sheets = DB.sheets.filter(s => s.id !== id);
  saveDB();
  openInvSheetModal();
}