/* ─── ACCOUNTS MODULE ──────────────────────────────────────────── */

function renderAccounts(container) {
  const totalBalance = DB.accounts.filter(a => a.type !== 'Credit Card').reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const totalCredit = DB.accounts.filter(a => a.type === 'Credit Card').reduce((s, a) => s + (parseFloat(a.creditLimit) || 0), 0);
  const usedCredit = DB.accounts.filter(a => a.type === 'Credit Card').reduce((s, a) => s + (parseFloat(a.usedCredit) || 0), 0);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Bank Accounts & <span>Cards</span></h1>
        <p class="page-subtitle">Manage all your accounts and credit cards</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openAddAccountModal()">+ Add Account</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Bank Balance</div>
        <div class="stat-value">${formatCurrency(totalBalance, true)}</div>
        <div class="stat-change">${DB.accounts.filter(a=>a.type!=='Credit Card').length} accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Credit Limit</div>
        <div class="stat-value">${formatCurrency(totalCredit, true)}</div>
        <div class="stat-change">${DB.accounts.filter(a=>a.type==='Credit Card').length} cards</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Credit Used</div>
        <div class="stat-value ${usedCredit > totalCredit * 0.8 ? 'text-danger' : ''}">${formatCurrency(usedCredit, true)}</div>
        <div class="stat-change">${totalCredit > 0 ? ((usedCredit/totalCredit)*100).toFixed(0) : 0}% utilisation</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Available Credit</div>
        <div class="stat-value">${formatCurrency(totalCredit - usedCredit, true)}</div>
        <div class="stat-change">Total available</div>
      </div>
    </div>

    <div class="section-title">Bank Accounts</div>
    <div class="account-grid" style="margin-bottom:24px">
      ${renderBankCards()}
    </div>

    <div class="section-title">Credit Cards</div>
    <div class="account-grid">
      ${renderCreditCards()}
    </div>
  `;
}

function renderBankCards() {
  const banks = DB.accounts.filter(a => a.type !== 'Credit Card');
  if (!banks.length) return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🏦</div>
      <h3>No bank accounts</h3>
      <p>Add your savings, current, or other accounts</p>
      <button class="btn btn-primary" onclick="openAddAccountModal('bank')">+ Add Account</button>
    </div>
  `;
  return banks.map(acc => `
    <div class="account-card" onclick="openAccountLedger('${acc.id}')">
      <div class="account-card-actions" onclick="event.stopPropagation()">
        <button class="acc-action-btn" onclick="editAccount('${acc.id}')">✏️</button>
        <button class="acc-action-btn" onclick="deleteAccount('${acc.id}')">🗑️</button>
      </div>
      <div class="account-type-badge">${escHtml(acc.type)}</div>
      <div class="account-balance">${formatCurrency(acc.balance, true)}</div>
      <div class="account-name-row">
        <div class="account-bank">${escHtml(acc.bank)}</div>
        <div class="account-name">${escHtml(acc.name)}</div>
      </div>
    </div>
  `).join('');
}

function renderCreditCards() {
  const cards = DB.accounts.filter(a => a.type === 'Credit Card');
  if (!cards.length) return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">💳</div>
      <h3>No credit cards</h3>
      <p>Add your credit cards to track limits and utilisation</p>
      <button class="btn btn-primary" onclick="openAddAccountModal('credit')">+ Add Card</button>
    </div>
  `;
  return cards.map(acc => {
    const used = parseFloat(acc.usedCredit) || 0;
    const limit = parseFloat(acc.creditLimit) || 1;
    const pct = Math.min(100, (used / limit) * 100);
    const available = Math.max(0, limit - used);
    return `
      <div class="account-card credit" onclick="openAccountLedger('${acc.id}')">
        <div class="account-card-actions" onclick="event.stopPropagation()">
          <button class="acc-action-btn" onclick="editAccount('${acc.id}')">✏️</button>
          <button class="acc-action-btn" onclick="deleteAccount('${acc.id}')">🗑️</button>
        </div>
        <div class="account-type-badge">CREDIT CARD</div>
        <div class="account-balance">${formatCurrency(available, true)}</div>
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;opacity:0.7;margin-bottom:4px">
            <span>₹${formatCurrency(used, true)} used</span>
            <span>Limit: ${formatCurrency(limit, true)}</span>
          </div>
          <div class="progress-bar" style="background:rgba(255,255,255,0.2)">
            <div class="progress-fill" style="width:${pct}%;background:${pct > 80 ? '#ef4444' : 'rgba(255,255,255,0.7)'}"></div>
          </div>
        </div>
        <div class="account-name-row">
          <div class="account-bank">${escHtml(acc.bank)}</div>
          <div class="account-name">${escHtml(acc.name)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddAccountModal(preset, editId) {
  const acc = editId ? DB.accounts.find(a => a.id === editId) : null;
  const v = (f) => escHtml(acc?.[f] || '');

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Account Type *</label>
        <select class="form-select" id="acc-type" onchange="toggleCreditFields()">
          ${['Savings','Current','Salary','Fixed Deposit','NRE/NRO','Credit Card'].map(t =>
            `<option value="${t}" ${acc?.type===t||(preset==='credit'&&t==='Credit Card')?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Account Name / Nickname *</label>
        <input class="form-input" id="acc-name" placeholder="e.g. Primary Savings" value="${v('name')}">
      </div>
      <div class="form-row">
        <label class="form-label">Bank / Institution *</label>
        <input class="form-input" id="acc-bank" placeholder="HDFC Bank" value="${v('bank')}">
      </div>
      <div class="form-row">
        <label class="form-label">Balance (₹)</label>
        <input class="form-input" id="acc-balance" type="number" placeholder="0" value="${v('balance')}">
      </div>
      <div id="credit-fields" style="display:none;grid-column:1/-1">
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">Credit Limit (₹) *</label>
            <input class="form-input" id="acc-credit-limit" type="number" placeholder="100000" value="${v('creditLimit')}">
          </div>
          <div class="form-row">
            <label class="form-label">Current Outstanding (₹)</label>
            <input class="form-input" id="acc-used-credit" type="number" placeholder="0" value="${v('usedCredit')}">
          </div>
          <div class="form-row">
            <label class="form-label">Due Date</label>
            <input type="date" class="form-input" id="acc-due-date" value="${v('dueDate')}">
          </div>
          <div class="form-row">
            <label class="form-label">Billing Cycle Date</label>
            <input class="form-input" id="acc-billing-day" type="number" min="1" max="28" placeholder="1" value="${v('billingDay')}">
          </div>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Account Number (last 4 digits)</label>
        <input class="form-input" id="acc-number" maxlength="4" placeholder="XXXX" value="${v('accountNumber')}">
      </div>
      <div class="form-row">
        <label class="form-label">IFSC (optional)</label>
        <input class="form-input" id="acc-ifsc" value="${v('ifsc')}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAccount('${editId||''}')">${acc ? 'Update' : 'Add'} Account</button>
    </div>
  `;
  openModal(acc ? 'Edit Account' : 'Add Account / Card', html, () => {
    toggleCreditFields();
    if (acc?.type === 'Credit Card') {
      document.getElementById('credit-fields').style.display = 'contents';
    }
  });
}

function toggleCreditFields() {
  const type = document.getElementById('acc-type')?.value;
  const fields = document.getElementById('credit-fields');
  if (fields) fields.style.display = type === 'Credit Card' ? 'contents' : 'none';
}

function saveAccount(editId) {
  const name = getVal('acc-name');
  const bank = getVal('acc-bank');
  const type = getVal('acc-type');
  if (!name) return showToast('Account name required', 'error');
  if (!bank) return showToast('Bank name required', 'error');

  const creditLimit = parseFloat(getVal('acc-credit-limit')) || 0;
  const usedCredit = parseFloat(getVal('acc-used-credit')) || 0;
  if (type === 'Credit Card' && usedCredit > creditLimit) return showToast('Outstanding cannot exceed credit limit', 'error');

  const acc = {
    id: editId || uid(),
    name, bank, type,
    balance: parseFloat(getVal('acc-balance')) || 0,
    creditLimit: type === 'Credit Card' ? creditLimit : undefined,
    usedCredit: type === 'Credit Card' ? usedCredit : undefined,
    dueDate: type === 'Credit Card' ? getVal('acc-due-date') : undefined,
    billingDay: type === 'Credit Card' ? getVal('acc-billing-day') : undefined,
    accountNumber: getVal('acc-number'),
    ifsc: getVal('acc-ifsc'),
  };

  if (editId) {
    const idx = DB.accounts.findIndex(a => a.id === editId);
    if (idx >= 0) DB.accounts[idx] = acc;
  } else {
    DB.accounts.push(acc);
    addLedgerEntry(acc.id, { type: 'Opening Balance', description: 'Account opened', amount: acc.balance || 0, credit: true });
  }

  saveDB();
  closeModal();
  showToast(editId ? 'Account updated!' : 'Account added!', 'success');
  renderPage('accounts');
}

function editAccount(id) { openAddAccountModal(null, id); }

function deleteAccount(id) {
  const acc = DB.accounts.find(a => a.id === id);
  if (!acc) return;
  const linked = DB.liabilities.filter(l => l.accountId === id).length +
                 DB.investments.filter(i => i.accountId === id).length;
  if (linked > 0) {
    return showToast(`Cannot delete: ${linked} items are linked to this account`, 'error');
  }
  if (!confirm('Delete this account? All its ledger entries will also be removed.')) return;
  DB.accounts = DB.accounts.filter(a => a.id !== id);
  delete DB.ledgers[id];
  saveDB();
  showToast('Account deleted', 'success');
  renderPage('accounts');
}

function openAccountLedger(id) {
  const acc = DB.accounts.find(a => a.id === id);
  if (!acc) return;
  const ledger = getLedger(id);
  const credits = ledger.filter(e => e.credit).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const debits = ledger.filter(e => !e.credit).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card" style="padding:14px"><div class="stat-label">Balance</div><div class="stat-value" style="font-size:1.1rem">${formatCurrency(acc.balance || (acc.type==='Credit Card'?acc.creditLimit-acc.usedCredit:0))}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Total In</div><div class="stat-value text-accent" style="font-size:1.1rem">${formatCurrency(credits, true)}</div></div>
      <div class="stat-card" style="padding:14px"><div class="stat-label">Total Out</div><div class="stat-value text-danger" style="font-size:1.1rem">${formatCurrency(debits, true)}</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px">
      <div class="ledger-title">Transaction History</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="openAddAccTransactionModal('${id}','${escHtml(acc.name)}')">+ Transaction</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLedger('${id}','${escHtml(acc.name)}')">⬇ Export</button>
      </div>
    </div>
    ${ledger.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
          <tbody>${ledger.map(e => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${escHtml(e.description)}</td>
              <td class="mono ${e.credit?'text-accent':'text-danger'}">${e.credit?'+':'−'}${formatCurrency(e.amount)}</td>
              <td><span class="badge ${e.credit?'badge-green':'badge-red'}">${e.type||'Txn'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No transactions yet</div>'}
  `;
  openModal(`🏦 ${acc.name}`, html);
}

function openAddAccTransactionModal(accId, accName) {
  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Date *</label>
        <input type="date" class="form-input" id="txn-date" value="${today()}" max="${today()}">
      </div>
      <div class="form-row">
        <label class="form-label">Type</label>
        <select class="form-select" id="txn-type">
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
          <option value="Transfer">Transfer</option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-input" id="txn-amount" type="number" placeholder="0">
      </div>
      <div class="form-row">
        <label class="form-label">Description</label>
        <input class="form-input" id="txn-desc" placeholder="e.g. Salary credit">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAccTransaction('${accId}','${accName}')">Add</button>
    </div>
  `;
  openModal(`Transaction — ${accName}`, html);
}

function saveAccTransaction(accId, accName) {
  const date = getVal('txn-date');
  const amount = parseFloat(getVal('txn-amount'));
  const type = getVal('txn-type');
  const description = getVal('txn-desc');
  if (!date) return showToast('Date required', 'error');
  if (!amount || amount <= 0) return showToast('Enter valid amount', 'error');

  const credit = type === 'Credit';
  const acc = DB.accounts.find(a => a.id === accId);
  if (acc) {
    if (acc.type === 'Credit Card') {
      acc.usedCredit = Math.max(0, (parseFloat(acc.usedCredit) || 0) + (credit ? -(amount) : amount));
      if (acc.usedCredit > acc.creditLimit) return showToast('⚠ Transaction would exceed credit limit!', 'error');
    } else {
      acc.balance = (parseFloat(acc.balance) || 0) + (credit ? amount : -amount);
    }
  }

  addLedgerEntry(accId, { date, amount, type, description: description || type, credit });
  saveDB();
  closeModal();
  openAccountLedger(accId);
  showToast('Transaction added!', 'success');
}