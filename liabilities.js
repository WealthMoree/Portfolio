/* ─── LIABILITIES MODULE ───────────────────────────────────────── */

const LIABILITY_TYPES = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card Bill', 'Business Loan', 'Gold Loan', 'Other'];

// ─── DYNAMIC LOAN END DATE ───────────────────────────────────────
// Calculates end date from startDate + paidMonths + remaining months
function getLoanEndDate(loan) {
  const principal = parseFloat(loan.amount) || 0;
  const rate = parseFloat(loan.interestRate) || 0;
  const tenure = parseFloat(loan.tenureMonths) || 1;
  const paidMonths = parseFloat(loan.paidMonths) || 0;
  if (!loan.startDate) return null;

  // If there are custom EMI payments in the ledger, project remaining months
  const outstanding = Math.max(0, Calc.loanOutstanding(principal, rate, tenure, paidMonths));
  const monthlyEmi = parseFloat(loan.emiAmount) || Calc.emi(principal, rate, tenure);

  if (outstanding <= 0 || monthlyEmi <= 0) {
    // Loan closed — end date is when last EMI was paid
    return addMonths(loan.startDate, paidMonths);
  }

  // Remaining months based on outstanding balance and current EMI
  const monthlyRate = rate / 12 / 100;
  let remainingMonths;
  if (monthlyRate === 0) {
    remainingMonths = Math.ceil(outstanding / monthlyEmi);
  } else {
    // n = -log(1 - P*r/EMI) / log(1+r)
    const num = 1 - (outstanding * monthlyRate / monthlyEmi);
    if (num <= 0) remainingMonths = tenure - paidMonths; // fallback
    else remainingMonths = Math.ceil(-Math.log(num) / Math.log(1 + monthlyRate));
  }

  // End date = today + remaining months (since paidMonths tracks payments made)
  const lastPaymentDate = addMonths(loan.startDate, paidMonths);
  return addMonths(lastPaymentDate, remainingMonths);
}

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
    const isCompleted = paidMonths >= tenure || outstanding <= 0;
    const dynamicEndDate = getLoanEndDate(l);
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
          <div class="loan-detail-item" title="Dynamically updated based on payments">
            <div class="dl">🔄 Ends By</div>
            <div class="dv ${isCompleted ? 'text-accent' : ''}">${dynamicEndDate ? formatDate(dynamicEndDate) : '—'}</div>
          </div>
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
          <button class="btn btn-secondary btn-sm" onclick="openPrepaymentModal('${l.id}')">⚡ Prepay</button>
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
        <label class="form-label">Custom EMI Amount (₹)</label>
        <input class="form-input" id="loan-emi" type="number" placeholder="Auto-calculated" value="${v('emiAmount')}">
        <span class="form-hint">Override to use your actual EMI (e.g. after rate change)</span>
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
      <button class="btn btn-primary" onclick="saveLiability('${editId||''}')"> ${loan ? 'Update' : 'Add'} Loan</button>
    </div>
  `;
  openModal(loan ? 'Edit Loan' : 'Add Loan / Liability', html, () => { if (loan) calcLoanEMI(); });
}

function calcLoanEMI() {
  const amt = parseFloat(document.getElementById('loan-amount')?.value) || 0;
  const rate = parseFloat(document.getElementById('loan-rate')?.value) || 0;
  const tenure = parseFloat(document.getElementById('loan-tenure')?.value) || 0;
  const preview = document.getElementById('loan-emi-preview');
  if (!preview || !amt || !tenure) { if (preview) preview.classList.add('hidden'); return; }
  const emi = Calc.emi(amt, rate, tenure);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amt;
  preview.classList.remove('hidden');
  preview.innerHTML = `📊 EMI: <strong>${formatCurrency(emi)}/month</strong> &nbsp;|&nbsp; Total Payable: <strong>${formatCurrency(totalPayable, true)}</strong> &nbsp;|&nbsp; Total Interest: <strong>${formatCurrency(totalInterest, true)}</strong>`;
  const emiInput = document.getElementById('loan-emi');
  if (emiInput && !emiInput.value) emiInput.placeholder = formatCurrency(emi);
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
  const defaultEmi = parseFloat(loan.emiAmount) || Calc.emi(parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0, parseFloat(loan.tenureMonths)||1);

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Payment Date *</label>
        <input type="date" class="form-input" id="emi-date" value="${today()}" max="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">EMI Amount (₹) *</label>
        <input class="form-input" id="emi-amount" type="number" value="${defaultEmi.toFixed(0)}">
        <span class="form-hint">Change to record actual paid amount (e.g. after prepayment/rate change)</span>
      </div>
      <div class="form-row">
        <label class="form-label">Number of EMIs</label>
        <input class="form-input" id="emi-count" type="number" value="1" min="1" max="${remaining}">
        <span class="form-hint">Remaining: ${remaining} EMIs</span>
      </div>
      <div class="form-row">
        <label class="form-label">Notes</label>
        <input class="form-input" id="emi-notes" placeholder="Optional note">
      </div>
    </div>
    <div id="emi-impact-preview" class="calc-box" style="margin-top:8px">
      Loading impact preview…
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEMIPayment('${id}')">Record Payment</button>
    </div>
  `;
  openModal(`💳 Record EMI — ${loan.name}`, html);

  // Show preview after render
  setTimeout(() => {
    const amtEl = document.getElementById('emi-amount');
    const cntEl = document.getElementById('emi-count');
    const updatePreview = () => {
      const amt = parseFloat(amtEl?.value) || 0;
      const cnt = parseInt(cntEl?.value) || 1;
      const newPaid = (parseFloat(loan.paidMonths) || 0) + cnt;
      const newOutstanding = Math.max(0, Calc.loanOutstanding(
        parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0,
        parseFloat(loan.tenureMonths)||1, newPaid
      ));
      const tempLoan = { ...loan, paidMonths: newPaid, emiAmount: amt };
      const newEndDate = getLoanEndDate(tempLoan);
      const preview = document.getElementById('emi-impact-preview');
      if (preview) {
        preview.innerHTML = `After this payment: Outstanding <strong>${formatCurrency(newOutstanding, true)}</strong> · New end date: <strong>${newEndDate ? formatDate(newEndDate) : '—'}</strong>`;
      }
    };
    amtEl?.addEventListener('input', updatePreview);
    cntEl?.addEventListener('input', updatePreview);
    updatePreview();
  }, 50);
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

// ─── PREPAYMENT ───────────────────────────────────────────────────
function openPrepaymentModal(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0, parseFloat(loan.tenureMonths)||1, parseFloat(loan.paidMonths)||0));

  const html = `
    <div class="form-grid">
      <div class="form-row full">
        <div class="calc-box">Current Outstanding: <strong>${formatCurrency(outstanding)}</strong></div>
      </div>
      <div class="form-row">
        <label class="form-label">Prepayment Amount (₹) *</label>
        <input class="form-input" id="prepay-amount" type="number" placeholder="100000" oninput="calcPrepayImpact('${id}')">
      </div>
      <div class="form-row">
        <label class="form-label">Reduce</label>
        <select class="form-select" id="prepay-reduce" onchange="calcPrepayImpact('${id}')">
          <option value="tenure">Tenure (pay off faster)</option>
          <option value="emi">EMI (lower monthly payment)</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="prepay-date" value="${today()}">
      </div>
    </div>
    <div id="prepay-preview" class="calc-box hidden" style="margin-top:8px"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePrepayment('${id}')">Record Prepayment</button>
    </div>
  `;
  openModal(`⚡ Prepayment — ${loan.name}`, html);
}

function calcPrepayImpact(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const prepay = parseFloat(document.getElementById('prepay-amount')?.value) || 0;
  const preview = document.getElementById('prepay-preview');
  if (!preview || !prepay) { preview?.classList.add('hidden'); return; }

  const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0, parseFloat(loan.tenureMonths)||1, parseFloat(loan.paidMonths)||0));
  const newOutstanding = Math.max(0, outstanding - prepay);
  const rate = parseFloat(loan.interestRate) || 0;
  const monthlyRate = rate / 12 / 100;
  const currentEmi = parseFloat(loan.emiAmount) || Calc.emi(parseFloat(loan.amount)||0, rate, parseFloat(loan.tenureMonths)||1);

  const reduceType = document.getElementById('prepay-reduce')?.value;
  let impact = '';
  if (reduceType === 'tenure') {
    let newTenure = 0;
    if (monthlyRate === 0) newTenure = Math.ceil(newOutstanding / currentEmi);
    else {
      const num = 1 - (newOutstanding * monthlyRate / currentEmi);
      newTenure = num <= 0 ? 0 : Math.ceil(-Math.log(num) / Math.log(1 + monthlyRate));
    }
    const savedMonths = (parseFloat(loan.tenureMonths) - parseFloat(loan.paidMonths)) - newTenure;
    const newEndDate = addMonths(today(), newTenure);
    impact = `New Outstanding: <strong>${formatCurrency(newOutstanding)}</strong> · Saves <strong>${savedMonths} months</strong> · New end: <strong>${formatDate(newEndDate)}</strong>`;
  } else {
    const newEmi = monthlyRate === 0
      ? newOutstanding / (parseFloat(loan.tenureMonths) - parseFloat(loan.paidMonths))
      : newOutstanding * monthlyRate / (1 - Math.pow(1 + monthlyRate, -(parseFloat(loan.tenureMonths) - parseFloat(loan.paidMonths))));
    impact = `New Outstanding: <strong>${formatCurrency(newOutstanding)}</strong> · New EMI: <strong>${formatCurrency(newEmi)}/month</strong>`;
  }

  preview.classList.remove('hidden');
  preview.innerHTML = '⚡ Impact: ' + impact;
}

function savePrepayment(id) {
  const loan = DB.liabilities.find(l => l.id === id);
  if (!loan) return;
  const amount = parseFloat(getVal('prepay-amount'));
  const date = getVal('prepay-date');
  const reduceType = getVal('prepay-reduce');
  if (!amount || amount <= 0) return showToast('Enter prepayment amount', 'error');

  // Adjust the loan principal (reduce outstanding by increasing paidMonths equivalent or reducing principal)
  // Best approach: reduce the stored principal directly
  const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(loan.amount)||0, parseFloat(loan.interestRate)||0, parseFloat(loan.tenureMonths)||1, parseFloat(loan.paidMonths)||0));
  const newOutstanding = Math.max(0, outstanding - amount);
  const rate = parseFloat(loan.interestRate) || 0;
  const monthlyRate = rate / 12 / 100;
  const remainingMonths = parseFloat(loan.tenureMonths) - parseFloat(loan.paidMonths);

  if (reduceType === 'tenure') {
    // Recalculate tenure with same EMI
    const emi = parseFloat(loan.emiAmount) || Calc.emi(parseFloat(loan.amount)||0, rate, parseFloat(loan.tenureMonths)||1);
    let newRemainingMonths;
    if (monthlyRate === 0) newRemainingMonths = Math.ceil(newOutstanding / emi);
    else {
      const num = 1 - (newOutstanding * monthlyRate / emi);
      newRemainingMonths = num <= 0 ? 0 : Math.ceil(-Math.log(num) / Math.log(1 + monthlyRate));
    }
    loan.tenureMonths = parseFloat(loan.paidMonths) + newRemainingMonths;
  } else {
    // Recalculate EMI with same remaining tenure
    if (monthlyRate === 0) loan.emiAmount = remainingMonths > 0 ? newOutstanding / remainingMonths : 0;
    else loan.emiAmount = newOutstanding * monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingMonths));
  }

  // Reduce principal to reflect prepayment
  loan.amount = parseFloat(loan.amount) - amount;

  addLedgerEntry(id, { type: 'Prepayment', description: `Prepayment (reduce ${reduceType})`, amount, credit: false, date });

  if (loan.accountId) {
    const acc = DB.accounts.find(a => a.id === loan.accountId);
    if (acc) acc.balance = (parseFloat(acc.balance) || 0) - amount;
  }

  saveDB();
  closeModal();
  showToast('Prepayment recorded!', 'success');
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
  const endDate = getLoanEndDate(loan);

  const html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="ledger-title">EMI History</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="addEMIPayment('${id}');closeModal()">+ EMI</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLedger('${id}','${escHtml(loan.name)}')">⬇ Export</button>
      </div>
    </div>
    <div class="calc-box" style="margin-bottom:16px">
      Total Paid: <strong>${formatCurrency(totalPaid)}</strong> &nbsp;|&nbsp;
      EMIs: <strong>${loan.paidMonths}/${loan.tenureMonths}</strong> &nbsp;|&nbsp;
      🔄 End Date: <strong>${endDate ? formatDate(endDate) : '—'}</strong>
    </div>
    ${ledger.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th></th></tr></thead>
          <tbody id="ledger-tbody-${id}">${renderLedgerRows(id, ledger)}</tbody>
        </table>
      </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No ledger entries yet</div>'}
  `;
  openModal(`📋 ${loan.name}`, html);
}

function renderLedgerRows(entityId, ledger) {
  return ledger.map(e => `
    <tr id="ledger-row-${e.id}">
      <td>${formatDate(e.date)}</td>
      <td>${escHtml(e.description)}</td>
      <td class="mono ${e.credit?'text-accent':'text-danger'}">${e.credit?'+':'−'}${formatCurrency(e.amount)}</td>
      <td><span class="badge ${e.credit?'badge-green':'badge-red'}">${e.type}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn-ghost btn-sm" onclick="editLedgerEntry('${entityId}','${e.id}','liabilities')">✏️</button>
        <button class="btn-ghost btn-sm text-danger" onclick="deleteLedgerEntry('${entityId}','${e.id}','liabilities')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ─── LEDGER ENTRY EDITING ─────────────────────────────────────────
function editLedgerEntry(entityId, entryId, module) {
  const ledger = DB.ledgers[entityId] || [];
  const entry = ledger.find(e => e.id === entryId);
  if (!entry) return;

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="le-date" value="${entry.date || today()}">
      </div>
      <div class="form-row">
        <label class="form-label">Description</label>
        <input class="form-input" id="le-desc" value="${escHtml(entry.description || '')}">
      </div>
      <div class="form-row">
        <label class="form-label">Amount (₹)</label>
        <input class="form-input" id="le-amount" type="number" value="${entry.amount || ''}">
      </div>
      <div class="form-row">
        <label class="form-label">Type</label>
        <input class="form-input" id="le-type" value="${escHtml(entry.type || '')}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLedgerEntry('${entityId}','${entryId}','${module}')">Save</button>
    </div>
  `;
  openModal('Edit Ledger Entry', html);
}

function saveLedgerEntry(entityId, entryId, module) {
  const ledger = DB.ledgers[entityId] || [];
  const entry = ledger.find(e => e.id === entryId);
  if (!entry) return;
  entry.date = getVal('le-date') || entry.date;
  entry.description = getVal('le-desc');
  entry.amount = parseFloat(getVal('le-amount')) || entry.amount;
  entry.type = getVal('le-type');
  saveDB();
  closeModal();
  showToast('Entry updated!', 'success');
  // Re-open the ledger
  if (module === 'liabilities') openLiabilityLedger(entityId);
  else if (module === 'insurance') openInsuranceLedger(entityId);
}

function deleteLedgerEntry(entityId, entryId, module) {
  if (!confirm('Delete this entry?')) return;
  if (!DB.ledgers[entityId]) return;
  DB.ledgers[entityId] = DB.ledgers[entityId].filter(e => e.id !== entryId);
  saveDB();
  showToast('Entry deleted', 'success');
  if (module === 'liabilities') openLiabilityLedger(entityId);
  else if (module === 'insurance') openInsuranceLedger(entityId);
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
