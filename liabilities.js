/* ─── LIABILITIES MODULE ───────────────────────────────────────── */

const LIABILITY_TYPES = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card Bill', 'Business Loan', 'Gold Loan', 'Other'];

function renderLiabilities(container) {
  const totalOutstanding = getTotalLiabilities();
  const totalEMI = DB.liabilities.reduce((s, l) => {
    if ((parseFloat(l.paidMonths) || 0) >= (parseFloat(l.tenureMonths) || 0)) return s;
    return s + (parseFloat(l.emiAmount) || 0);
  }, 0);
  const activeLiabilities = DB.liabilities.filter(l => (parseFloat(l.paidMonths)||0) < (parseFloat(l.tenureMonths)||0));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Liabilities & <span>Loans</span></h1>
        <p class="page-subtitle">Track all your debt obligations</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddLiabilityModal()">+ Add Loan</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Outstanding</div>
        <div class="stat-value text-danger">${formatCurrency(totalOutstanding, true)}</div>
        <div class="stat-change">${activeLiabilities.length} active loans</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Monthly EMI</div>
        <div class="stat-value">${formatCurrency(totalEMI)}</div>
        <div class="stat-change">Total EMI outflow/month</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Closed Loans</div>
        <div class="stat-value">${DB.liabilities.length - activeLiabilities.length}</div>
        <div class="stat-change">Fully repaid</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Original Borrowed</div>
        <div class="stat-value">${formatCurrency(DB.liabilities.reduce((s,l) => s+(parseFloat(l.amount)||0), 0), true)}</div>
        <div class="stat-change">Total principal</div>
      </div>
    </div>

    <div class="chart-wrap" style="margin-bottom:24px">
      <div class="chart-title">Outstanding by Loan Type</div>
      <div id="liab-chart"></div>
    </div>

    <div class="section-title">All Loans</div>
    <div style="display:flex;flex-direction:column;gap:16px" id="liab-list">
      ${renderLiabilityCards()}
    </div>
  `;

  // Chart
  const byType = {};
  DB.liabilities.forEach(l => {
    const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(l.amount)||0, parseFloat(l.interestRate)||0, parseFloat(l.tenureMonths)||1, parseFloat(l.paidMonths)||0));
    byType[l.type] = (byType[l.type] || 0) + outstanding;
  });
  renderDonutChart(document.getElementById('liab-chart'), Object.entries(byType).map(([k, v]) => ({ label: k, value: v })));
}

function renderLiabilityCards() {
  if (!DB.liabilities.length) return `
    <div class="empty-state">
      <div class="empty-icon">📉</div>
      <h3>No loans added</h3>
      <p>Add your loans and credit card bills to track EMIs and outstanding amounts</p>
      <button class="btn btn-primary" onclick="openAddLiabilityModal()">+ Add Loan</button>
    </div>
  `;
  return DB.liabilities.map(l => {
    const principal = parseFloat(l.amount) || 0;
    const rate = parseFloat(l.interestRate) || 0;
    const tenure = parseFloat(l.tenureMonths) || 1;
    const paidMonths = parseFloat(l.paidMonths) || 0;
    const outstanding = Math.max(0, Calc.loanOutstanding(principal, rate, tenure, paidMonths));
    const pct = Math.min(100, (paidMonths / tenure) * 100);
    const emi = parseFloat(l.emiAmount) || Calc.emi(principal, rate, tenure);
    const isCompleted = paidMonths >= tenure;
    const lastEmiDate = l.startDate ? addMonths(l.startDate, tenure) : '-';
    const remainingMonths = Math.max(0, tenure - paidMonths);

    return `
      <div class="loan-card">
        <div>
          <div class="loan-name">${escHtml(l.name)}</div>
          <div class="loan-bank">${escHtml(l.lender || l.type)} ${l.accountId ? `· ${getAccountName(l.accountId)}` : ''}</div>
          ${isCompleted ? '<span class="badge badge-green" style="margin-top:6px">✓ Closed</span>' : ''}
        </div>
        <div style="text-align:right">
          <div class="loan-amount-main text-danger">${formatCurrency(outstanding, true)}</div>
          <div class="text-muted" style="font-size:0.75rem">outstanding</div>
        </div>
        <div class="loan-detail-grid">
          <div class="loan-detail-item"><div class="dl">Original Loan</div><div class="dv">${formatCurrency(principal, true)}</div></div>
          <div class="loan-detail-item"><div class="dl">EMI</div><div class="dv">${formatCurrency(emi)}/m</div></div>
          <div class="loan-detail-item"><div class="dl">Interest Rate</div><div class="dv">${rate}% p.a.</div></div>
          <div class="loan-detail-item"><div class="dl">Paid EMIs</div><div class="dv">${paidMonths}/${tenure}</div></div>
          <div class="loan-detail-item"><div class="dl">Remaining</div><div class="dv">${remainingMonths} months</div></div>
          <div class="loan-detail-item"><div class="dl">Closes By</div><div class="dv">${formatDate(lastEmiDate)}</div></div>
        </div>
        <div style="grid-column:1/-1">
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text3);margin-bottom:4px">
            <span>${pct.toFixed(0)}% paid</span>
            <span>${formatCurrency(principal - outstanding, true)} repaid</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="openLiabilityLedger('${l.id}')">📋 Ledger</button>
          <button class="btn btn-secondary btn-sm" onclick="addEMIPayment('${l.id}')">💳 Add EMI</button>
          <button class="btn btn-secondary btn-sm" onclick="editLiability('${l.id}')">✏️ Edit</button>
          ${!isCompleted ? `<button class="btn btn-secondary btn-sm" onclick="earlyCloseLoan('${l.id}')">🔒 Close Early</button>` : ''}
          <button class="btn-ghost btn-sm text-danger" onclick="deleteLiability('${l.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function openAddLiabilityModal(editId) {
  const loan = editId ? DB.liabilities.find(l => l.id === editId) : null;
  const v = (f) => escHtml(loan?.[f] || '');

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Loan Name *</label>
        <input class="form-input" id="loan-name" placeholder="e.g. HDFC Home Loan" value="${v('name')}">
      </div>
      <div class="form-row">
        <label class="form-label">Loan Type *</label>
        <select class="form-select" id="loan-type">
          ${LIABILITY_TYPES.map(t => `<option value="${t}" ${loan?.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Lender / Bank</label>
        <input class="form-input" id="loan-lender" placeholder="HDFC Bank" value="${v('lender')}">
      </div>
      <div class="form-row">
        <label class="form-label">Principal Amount (₹) *</label>
        <input class="form-input" id="loan-amount" type="number" placeholder="2000000" value="${v('amount')}" oninput="calcLoanEMI()">
      </div>
      <div class="form-row">
        <label class="form-label">Interest Rate (% p.a.) *</label>
        <input class="form-input" id="loan-rate" type="number" step="0.01" placeholder="8.5" value="${v('interestRate')}" oninput="calcLoanEMI()">
      </div>
      <div class="form-row">
        <label class="form-label">Tenure (months) *</label>
        <input class="form-input" id="loan-tenure" type="number" placeholder="240" value="${v('tenureMonths')}" oninput="calcLoanEMI()">
      </div>
      <div class="form-row">
        <label class="form-label">EMI Amount (₹)</label>
        <input class="form-input" id="loan-emi" type="number" placeholder="Auto-calculated" value="${v('emiAmount')}">
        <span class="form-hint">Leave blank to auto-calculate</span>
      </div>
      <div class="form-row">
        <label class="form-label">Start Date *</label>
        <input type="date" class="form-input" id="loan-start" value="${v('startDate') || today()}" max="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">EMIs Paid So Far</label>
        <input class="form-input" id="loan-paid" type="number" placeholder="0" min="0" value="${v('paidMonths') || '0'}">
      </div>
      <div class="form-row">
        <label class="form-label">Linked Account</label>
        <select class="form-select" id="loan-account">${accountOptions()}</select>
      </div>
      <div id="loan-emi-preview" class="calc-box hidden" style="grid-column:1/-1"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLiability('${editId||''}')">${loan ? 'Update' : 'Add'} Loan</button>
    </div>
  `;
  openModal(loan ? 'Edit Loan' : 'Add Loan / Liability', html, () => { if (loan) calcLoanEMI(); });
}

function calcLoanEMI() {
  const amt = parseFloat(document.getElementById('loan-amount')?.value) || 0;
  const rate = parseFloat(document.getElementById('loan-rate')?.value) || 0;
  const tenure = parseFloat(document.getElementById('loan-tenure')?.value) || 0;
  const preview = document.getElementById('loan-emi-preview');
  if (!preview || !amt || !rate || !tenure) { if (preview) preview.classList.add('hidden'); return; }
  const emi = Calc.emi(amt, rate, tenure);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amt;
  preview.classList.remove('hidden');
  preview.innerHTML = `📊 EMI: <strong>${formatCurrency(emi)}/month</strong> &nbsp;|&nbsp; Total Payable: <strong>${formatCurrency(totalPayable, true)}</strong> &nbsp;|&nbsp; Total Interest: <strong>${formatCurrency(totalInterest, true)}</strong>`;
  document.getElementById('loan-emi').placeholder = formatCurrency(emi);
}

function saveLiability(editId) {
  const name = getVal('loan-name');
  const amount = parseFloat(getVal('loan-amount'));
  const rate = parseFloat(getVal('loan-rate'));
  const tenure = parseInt(getVal('loan-tenure'));
  const paid = parseInt(getVal('loan-paid')) || 0;
  const startDate = getVal('loan-start');

  if (!name) return showToast('Loan name required', 'error');
  if (!amount || amount <= 0) return showToast('Enter valid loan amount', 'error');
  if (!tenure || tenure <= 0) return showToast('Enter valid tenure', 'error');
  if (paid < 0) return showToast('EMIs paid cannot be negative', 'error');
  if (paid > tenure) return showToast('EMIs paid cannot exceed tenure', 'error');

  const emiAmt = parseFloat(getVal('loan-emi')) || Calc.emi(amount, rate || 0, tenure);

  const loan = {
    id: editId || uid(),
    name, type: getVal('loan-type'), lender: getVal('loan-lender'),
    amount, interestRate: rate || 0, tenureMonths: tenure,
    emiAmount: emiAmt, startDate, paidMonths: paid,
    accountId: getVal('loan-account'),
  };

  if (editId) {
    const idx = DB.liabilities.findIndex(l => l.id === editId);
    if (idx >= 0) DB.liabilities[idx] = loan;
  } else {
    DB.liabilities.push(loan);
    addLedgerEntry(loan.id, { type: 'Disbursement', description: `Loan disbursed: ${name}`, amount, credit: true });
  }

  saveDB();
  closeModal();
  showToast(editId ? 'Loan updated!' : 'Loan added!', 'success');
  renderPage('liabilities');
}

function addEMIPayment(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const remaining = (parseFloat(loan.tenureMonths) || 0) - (parseFloat(loan.paidMonths) || 0);
  if (remaining <= 0) return showToast('Loan already closed!', 'warning');

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Payment Date *</label>
        <input type="date" class="form-input" id="emi-date" value="${today()}" max="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">EMI Amount (₹) *</label>
        <input class="form-input" id="emi-amount" type="number" value="${loan.emiAmount || ''}">
      </div>
      <div class="form-row">
        <label class="form-label">EMIs to Add</label>
        <input class="form-input" id="emi-count" type="number" value="1" min="1" max="${remaining}">
        <span class="form-hint">Remaining: ${remaining} EMIs</span>
      </div>
      <div class="form-row">
        <label class="form-label">Notes</label>
        <input class="form-input" id="emi-notes" placeholder="Optional">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEMIPayment('${id}')">Record Payment</button>
    </div>
  `;
  openModal(`💳 Record EMI — ${loan.name}`, html);
}

function saveEMIPayment(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const date = getVal('emi-date');
  const amount = parseFloat(getVal('emi-amount'));
  const count = parseInt(getVal('emi-count')) || 1;
  const notes = getVal('emi-notes');

  if (!date) return showToast('Date required', 'error');
  if (!amount || amount <= 0) return showToast('Enter valid EMI amount', 'error');

  const remaining = (parseFloat(loan.tenureMonths) || 0) - (parseFloat(loan.paidMonths) || 0);
  if (count > remaining) return showToast(`Only ${remaining} EMIs remaining`, 'error');

  loan.paidMonths = (parseFloat(loan.paidMonths) || 0) + count;

  // Deduct from linked account
  if (loan.accountId) {
    const acc = DB.accounts.find(a => a.id === loan.accountId);
    if (acc) {
      acc.balance = (parseFloat(acc.balance) || 0) - (amount * count);
      addLedgerEntry(acc.id, { type: 'EMI Debit', description: `EMI: ${loan.name}`, amount: amount * count, credit: false, date });
    }
  }

  addLedgerEntry(id, { type: 'EMI', description: `EMI payment${count > 1 ? ` (${count} months)` : ''}${notes ? ': ' + notes : ''}`, amount: amount * count, credit: false, date });
  saveDB();
  closeModal();
  showToast('EMI recorded!', 'success');
  renderPage('liabilities');
}

function earlyCloseLoan(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0, parseFloat(loan.tenureMonths)||1, parseFloat(loan.paidMonths)||0));

  const html = `
    <div class="form-grid">
      <div class="form-row full">
        <div class="calc-box">Outstanding balance: <strong>${formatCurrency(outstanding)}</strong></div>
      </div>
      <div class="form-row">
        <label class="form-label">Closure Amount (₹) *</label>
        <input class="form-input" id="closure-amount" type="number" value="${outstanding.toFixed(0)}">
        <span class="form-hint">May include prepayment penalty</span>
      </div>
      <div class="form-row">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="closure-date" value="${today()}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="confirmCloseLoan('${id}')">Close Loan</button>
    </div>
  `;
  openModal(`🔒 Early Closure — ${loan.name}`, html);
}

function confirmCloseLoan(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const amount = parseFloat(getVal('closure-amount'));
  const date = getVal('closure-date');
  if (!amount || amount <= 0) return showToast('Enter closure amount', 'error');
  loan.paidMonths = loan.tenureMonths;
  addLedgerEntry(id, { type: 'Closure', description: 'Early loan closure', amount, credit: false, date });
  saveDB();
  closeModal();
  showToast('Loan closed!', 'success');
  renderPage('liabilities');
}

function openLiabilityLedger(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const ledger = getLedger(id);
  const totalPaid = ledger.filter(e => !e.credit).reduce((s, e) => s + e.amount, 0);

  const html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="ledger-title">EMI History</div>
      <button class="btn btn-secondary btn-sm" onclick="exportLedger('${id}','${escHtml(loan.name)}')">⬇ Export</button>
    </div>
    <div class="calc-box" style="margin-bottom:16px">Total Paid: <strong>${formatCurrency(totalPaid)}</strong> &nbsp;|&nbsp; EMIs: <strong>${loan.paidMonths}/${loan.tenureMonths}</strong></div>
    ${ledger.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
          <tbody>${ledger.map(e => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${escHtml(e.description)}</td>
              <td class="mono ${e.credit?'text-accent':'text-danger'}">${e.credit?'+':'−'}${formatCurrency(e.amount)}</td>
              <td><span class="badge ${e.credit?'badge-green':'badge-red'}">${e.type}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No ledger entries yet</div>'}
  `;
  openModal(`📋 ${loan.name}`, html);
}

function editLiability(id) { openAddLiabilityModal(id); }

function deleteLiability(id) {
  if (!confirm('Delete this loan? All records will be lost.')) return;
  DB.liabilities = DB.liabilities.filter(l => l.id !== id);
  delete DB.ledgers[id];
  saveDB();
  showToast('Loan deleted', 'success');
  renderPage('liabilities');
}