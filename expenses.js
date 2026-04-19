/* ─── EXPENSES MODULE ───────────────────────────────────────────── */

const EXP_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Fuel', 'Shopping',
  'Entertainment', 'Health & Medical', 'Utilities', 'Rent & Housing',
  'Education', 'Travel', 'Insurance', 'EMI / Loan', 'SIP / Investment',
  'Subscriptions', 'Personal Care', 'Gifts & Donations', 'Other'
];

const EXP_CAT_ICONS = {
  'Food & Dining':    '🍽️', 'Groceries':       '🛒', 'Transport':        '🚌',
  'Fuel':             '⛽', 'Shopping':         '🛍️', 'Entertainment':    '🎬',
  'Health & Medical': '🏥', 'Utilities':        '💡', 'Rent & Housing':   '🏠',
  'Education':        '📚', 'Travel':           '✈️', 'Insurance':        '🛡️',
  'EMI / Loan':       '🏦', 'SIP / Investment': '📈', 'Subscriptions':    '📱',
  'Personal Care':    '💆', 'Gifts & Donations':'🎁', 'Other':            '💸'
};

const EXP_CAT_COLORS = {
  'Food & Dining':    '#f59e0b', 'Groceries':       '#22c55e', 'Transport':        '#3b82f6',
  'Fuel':             '#ef4444', 'Shopping':        '#ec4899', 'Entertainment':    '#8b5cf6',
  'Health & Medical': '#06b6d4', 'Utilities':       '#f97316', 'Rent & Housing':   '#84cc16',
  'Education':        '#14b8a6', 'Travel':          '#a855f7', 'Insurance':        '#0ea5e9',
  'EMI / Loan':       '#e11d48', 'SIP / Investment':'#10b981', 'Subscriptions':    '#6366f1',
  'Personal Care':    '#f43f5e', 'Gifts & Donations':'#d946ef','Other':            '#6b7280'
};

let expFilter = { month: '', category: '', search: '' };

// ─── MAIN RENDER ────────────────────────────────────────────────
function renderExpenses(container) {
  const now     = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthExp = DB.expenses.filter(e => e.date?.startsWith(thisMonthKey));
  const lastMonthExp = DB.expenses.filter(e => e.date?.startsWith(lastMonthKey));

  const thisTotal    = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const lastTotal    = lastMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalAllTime = DB.expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const avgMonthly   = getAvgMonthlyExpense();
  const changePct    = lastTotal > 0 ? (((thisTotal - lastTotal) / lastTotal) * 100).toFixed(1) : null;

  // Unique months for filter dropdown (newest first)
  const months = [...new Set(
    DB.expenses.map(e => e.date?.slice(0, 7)).filter(Boolean)
  )].sort().reverse();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Expense <span>Tracker</span></h1>
        <p class="page-subtitle">Monitor and analyse your spending patterns</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="openBudgetModal()">🎯 Budgets</button>
        <button class="btn btn-secondary btn-sm" onclick="exportExpensesCSV()">⬇ CSV</button>
        <button class="btn btn-primary" onclick="openAddExpenseModal()">+ Add Expense</button>
      </div>
    </div>

    <!-- Stat Grid -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">This Month</div>
        <div class="stat-value">${formatCurrency(thisTotal, true)}</div>
        <div class="stat-change ${changePct === null ? '' : parseFloat(changePct) <= 0 ? 'up' : 'down'}">
          ${changePct !== null ? `${changePct > 0 ? '+' : ''}${changePct}% vs last month` : 'No prior data'}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Last Month</div>
        <div class="stat-value">${formatCurrency(lastTotal, true)}</div>
        <div class="stat-change">${lastMonthExp.length} transactions</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg / Month</div>
        <div class="stat-value">${formatCurrency(avgMonthly, true)}</div>
        <div class="stat-change">Based on history</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">All-Time Total</div>
        <div class="stat-value">${formatCurrency(totalAllTime, true)}</div>
        <div class="stat-change">${DB.expenses.length} transactions</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="two-col" style="margin-bottom:24px">
      <div class="chart-wrap">
        <div class="chart-title">Category Breakdown — This Month</div>
        <div id="exp-cat-donut"></div>
      </div>
      <div class="chart-wrap">
        <div class="chart-title">Monthly Trend — Last 6 Months</div>
        <div id="exp-monthly-bar"></div>
      </div>
    </div>

    <!-- Budget Progress -->
    ${renderBudgetProgress(thisMonthExp)}

    <!-- Filters -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center">
      <div class="search-bar" style="flex:1;min-width:200px">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Search expenses..." id="exp-search"
          oninput="filterExpenses()" value="${escHtml(expFilter.search)}">
      </div>
      <select class="form-select" id="exp-month-filter" style="width:auto" onchange="filterExpenses()">
        <option value="">All Months</option>
        ${months.map(m => {
          const [yr, mo] = m.split('-');
          const label = new Date(+yr, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          return `<option value="${m}" ${expFilter.month === m ? 'selected' : ''}>${label}</option>`;
        }).join('')}
      </select>
      <select class="form-select" id="exp-cat-filter" style="width:auto" onchange="filterExpenses()">
        <option value="">All Categories</option>
        ${EXP_CATEGORIES.map(c =>
          `<option value="${c}" ${expFilter.category === c ? 'selected' : ''}>${EXP_CAT_ICONS[c] || ''} ${c}</option>`
        ).join('')}
      </select>
      <button class="btn btn-secondary btn-sm" onclick="clearExpenseFilters()">✕ Clear</button>
    </div>

    <!-- Expense List -->
    <div id="exp-table-container">
      ${renderExpenseRows(getFilteredExpenses())}
    </div>
  `;

  // Draw charts
  renderExpCatChart(thisMonthExp);
  renderExpMonthlyChart();
}

// ─── HELPERS ────────────────────────────────────────────────────
function getAvgMonthlyExpense() {
  const monthly = {};
  DB.expenses.forEach(e => {
    const m = e.date?.slice(0, 7);
    if (m) monthly[m] = (monthly[m] || 0) + (parseFloat(e.amount) || 0);
  });
  const vals = Object.values(monthly);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function getFilteredExpenses() {
  const search = expFilter.search.toLowerCase();
  return [...DB.expenses]
    .filter(e => {
      if (expFilter.month    && !e.date?.startsWith(expFilter.month))    return false;
      if (expFilter.category &&  e.category !== expFilter.category)       return false;
      if (search && !(
        e.description?.toLowerCase().includes(search) ||
        e.category?.toLowerCase().includes(search)
      )) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function filterExpenses() {
  expFilter.search   = document.getElementById('exp-search')?.value || '';
  expFilter.month    = document.getElementById('exp-month-filter')?.value || '';
  expFilter.category = document.getElementById('exp-cat-filter')?.value || '';
  document.getElementById('exp-table-container').innerHTML =
    renderExpenseRows(getFilteredExpenses());
}

function clearExpenseFilters() {
  expFilter = { month: '', category: '', search: '' };
  renderPage('expenses');
}

// ─── BUDGET PROGRESS WIDGET ──────────────────────────────────────
function renderBudgetProgress(thisMonthExp) {
  if (!DB.budgets || !Object.keys(DB.budgets).length) return '';
  const rows = Object.entries(DB.budgets).map(([cat, limit]) => {
    const spent = thisMonthExp
      .filter(e => e.category === cat)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const pct  = Math.min(100, (spent / limit) * 100);
    const over = spent > limit;
    const barColor = over ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : 'var(--accent)';
    return `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:0.85rem;font-weight:600">
            ${EXP_CAT_ICONS[cat] || ''} ${escHtml(cat)}
          </span>
          <span style="font-size:0.8rem;color:${over ? 'var(--danger)' : 'var(--text2)'}">
            ${formatCurrency(spent, true)} / ${formatCurrency(limit, true)}
            ${over ? ' ⚠ Over!' : ''}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div class="section-title" style="margin:0;font-size:0.85rem">🎯 Budget Progress — This Month</div>
        <button class="btn btn-secondary btn-sm" onclick="openBudgetModal()">Edit Budgets</button>
      </div>
      ${rows}
    </div>`;
}

// ─── CHARTS ─────────────────────────────────────────────────────
function renderExpCatChart(expenses) {
  const el = document.getElementById('exp-cat-donut');
  if (!el) return;
  const bycat = {};
  expenses.forEach(e => {
    if (e.category) bycat[e.category] = (bycat[e.category] || 0) + (parseFloat(e.amount) || 0);
  });
  const data = Object.entries(bycat).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: k.length > 8 ? k.slice(0, 8) + '…' : k, value: v }));
  if (!data.length) {
    el.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="empty-icon">💸</div><p>No expenses this month</p></div>';
    return;
  }
  renderDonutChart(el, data);
}

function renderExpMonthlyChart() {
  const el = document.getElementById('exp-monthly-bar');
  if (!el) return;
  const monthly = {};
  DB.expenses.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthly[key] = (monthly[key] || 0) + (parseFloat(e.amount) || 0);
  });
  const data = Object.entries(monthly).slice(-6).map(([label, value]) => ({ label, value }));
  if (!data.length) {
    el.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="empty-icon">📊</div><p>No expense history</p></div>';
    return;
  }
  renderBarChart(el, data);
}

// ─── EXPENSE ROWS (grouped by date) ─────────────────────────────
function renderExpenseRows(expenses) {
  if (!expenses.length) return `
    <div class="empty-state">
      <div class="empty-icon">💸</div>
      <h3>${DB.expenses.length ? 'No matching expenses' : 'No expenses yet'}</h3>
      <p>${DB.expenses.length ? 'Try adjusting your filters.' : 'Start tracking your daily spending.'}</p>
      <button class="btn btn-primary" onclick="openAddExpenseModal()">+ Add Expense</button>
    </div>`;

  // Group by date
  const grouped = {};
  expenses.forEach(e => {
    const d = e.date || 'Unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  });

  return Object.entries(grouped).map(([date, exps]) => {
    const dayTotal = exps.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return `
      <div style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 4px;border-bottom:2px solid var(--border);margin-bottom:4px">
          <span style="font-size:0.8rem;font-weight:700;color:var(--text2)">${formatDate(date)}</span>
          <span class="mono text-danger" style="font-size:0.8rem;font-weight:700">
            −${formatCurrency(dayTotal, true)}
          </span>
        </div>
        ${exps.map(e => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;
                      transition:background 0.15s;cursor:default"
               onmouseover="this.style.background='var(--bg3)'"
               onmouseout="this.style.background=''">
            <!-- Category icon bubble -->
            <div style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;
                        justify-content:center;font-size:1.1rem;flex-shrink:0;
                        background:${EXP_CAT_COLORS[e.category] || '#6b7280'}20">
              ${EXP_CAT_ICONS[e.category] || '💸'}
            </div>
            <!-- Description + meta -->
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.9rem;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${escHtml(e.description || 'Expense')}
              </div>
              <div style="font-size:0.73rem;color:var(--text3);display:flex;
                          gap:6px;align-items:center;margin-top:2px;flex-wrap:wrap">
                <span class="badge" style="
                  background:${EXP_CAT_COLORS[e.category] || '#6b7280'}18;
                  color:${EXP_CAT_COLORS[e.category] || '#6b7280'};
                  padding:1px 7px;font-size:0.67rem">
                  ${escHtml(e.category || 'Other')}
                </span>
                ${e.accountId ? `<span>· ${escHtml(getAccountName(e.accountId))}</span>` : ''}
                ${e.notes    ? `<span title="${escHtml(e.notes)}">· 📝 ${escHtml(e.notes.slice(0,30))}${e.notes.length>30?'…':''}</span>` : ''}
              </div>
            </div>
            <!-- Amount -->
            <div class="mono text-danger" style="font-weight:700;font-size:0.95rem;
                        flex-shrink:0;white-space:nowrap">
              −${formatCurrency(e.amount)}
            </div>
            <!-- Actions -->
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn-icon btn-sm" title="Edit"   onclick="editExpense('${e.id}')">✏️</button>
              <button class="btn-icon btn-sm" title="Delete" onclick="deleteExpense('${e.id}')">🗑️</button>
            </div>
          </div>`).join('')}
      </div>`;
  }).join('');
}

// ─── ADD / EDIT EXPENSE MODAL ─────────────────────────────────────
function openAddExpenseModal(editId) {
  const exp = editId ? DB.expenses.find(e => e.id === editId) : null;
  const v   = (f) => escHtml(exp?.[f] || '');

  const html = `
    <div class="form-grid">
      <div class="form-row">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-input" id="exp-amount" type="number" placeholder="0.00"
          step="0.01" value="${v('amount')}" autofocus>
      </div>
      <div class="form-row">
        <label class="form-label">Date *</label>
        <input type="date" class="form-input" id="exp-date"
          value="${v('date') || today()}" max="${today()}">
      </div>
      <div class="form-row full">
        <label class="form-label">Description *</label>
        <input class="form-input" id="exp-desc"
          placeholder="e.g. Lunch at Swiggy" value="${v('description')}">
      </div>
      <div class="form-row">
        <label class="form-label">Category *</label>
        <select class="form-select" id="exp-category">
          ${EXP_CATEGORIES.map(c =>
            `<option value="${c}" ${exp?.category === c ? 'selected' : ''}>${EXP_CAT_ICONS[c] || ''} ${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">Payment From (Account)</label>
        <select class="form-select" id="exp-account">${accountOptions()}</select>
      </div>
      <div class="form-row full">
        <label class="form-label">Notes</label>
        <input class="form-input" id="exp-notes"
          placeholder="Optional notes" value="${v('notes')}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveExpense('${editId || ''}')">
        ${exp ? 'Update' : 'Add'} Expense
      </button>
    </div>`;

  openModal(exp ? 'Edit Expense' : '+ Add Expense', html, () => {
    if (exp?.accountId) {
      const sel = document.getElementById('exp-account');
      if (sel) sel.value = exp.accountId;
    }
    // Submit on Enter key in the amount field
    document.getElementById('exp-amount')?.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') saveExpense(editId || '');
    });
  });
}

function saveExpense(editId) {
  const amount      = parseFloat(document.getElementById('exp-amount')?.value);
  const date        = document.getElementById('exp-date')?.value;
  const description = document.getElementById('exp-desc')?.value?.trim();
  const category    = document.getElementById('exp-category')?.value;
  const accountId   = document.getElementById('exp-account')?.value || null;
  const notes       = document.getElementById('exp-notes')?.value?.trim() || null;

  if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
  if (!date)                  return showToast('Date is required', 'error');
  if (!description)           return showToast('Description is required', 'error');
  if (!category)              return showToast('Select a category', 'error');

  // If editing: reverse the old account deduction first
  if (editId) {
    const old = DB.expenses.find(e => e.id === editId);
    if (old?.accountId) {
      const acc = DB.accounts.find(a => a.id === old.accountId);
      if (acc) {
        if (acc.type === 'Credit Card') {
          acc.usedCredit = Math.max(0, (parseFloat(acc.usedCredit) || 0) - (parseFloat(old.amount) || 0));
        } else {
          acc.balance = (parseFloat(acc.balance) || 0) + (parseFloat(old.amount) || 0);
        }
      }
    }
  }

  const exp = { id: editId || uid(), amount, date, description, category, accountId, notes };

  if (editId) {
    const idx = DB.expenses.findIndex(e => e.id === editId);
    if (idx >= 0) DB.expenses[idx] = exp;
  } else {
    DB.expenses.push(exp);
  }

  // Apply new account deduction
  if (accountId) {
    const acc = DB.accounts.find(a => a.id === accountId);
    if (acc) {
      if (acc.type === 'Credit Card') {
        acc.usedCredit = Math.min(
          parseFloat(acc.creditLimit) || 0,
          (parseFloat(acc.usedCredit) || 0) + amount
        );
      } else {
        acc.balance = (parseFloat(acc.balance) || 0) - amount;
      }
      addLedgerEntry(accountId, {
        date, amount,
        type:        'Expense',
        description: `${category}: ${description}`,
        credit:      false,
      });
    }
  }

  saveDB();
  closeModal();
  showToast(editId ? 'Expense updated!' : 'Expense added!', 'success');
  renderPage('expenses');
}

function editExpense(id) { openAddExpenseModal(id); }

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const exp = DB.expenses.find(e => e.id === id);
  // Reverse account deduction
  if (exp?.accountId) {
    const acc = DB.accounts.find(a => a.id === exp.accountId);
    if (acc) {
      if (acc.type === 'Credit Card') {
        acc.usedCredit = Math.max(0, (parseFloat(acc.usedCredit) || 0) - (parseFloat(exp.amount) || 0));
      } else {
        acc.balance = (parseFloat(acc.balance) || 0) + (parseFloat(exp.amount) || 0);
      }
    }
  }
  DB.expenses = DB.expenses.filter(e => e.id !== id);
  saveDB();
  showToast('Expense deleted', 'success');
  renderPage('expenses');
}

// ─── BUDGET MANAGER ──────────────────────────────────────────────
function openBudgetModal() {
  if (!DB.budgets) DB.budgets = {};
  const html = `
    <p style="font-size:0.85rem;color:var(--text2);margin-bottom:16px">
      Set monthly spending limits per category. You'll see a progress bar on the Expenses page.
    </p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${EXP_CATEGORIES.map(cat => {
        const safeId = 'budget-' + cat.replace(/\W+/g, '_');
        const current = DB.budgets[cat] || '';
        return `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="width:190px;font-size:0.85rem;flex-shrink:0">
              ${EXP_CAT_ICONS[cat] || ''} ${escHtml(cat)}
            </span>
            <input class="form-input" type="number" id="${safeId}"
              placeholder="No limit" value="${escHtml(String(current))}" min="0" step="100">
          </div>`;
      }).join('')}
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBudgets()">Save Budgets</button>
    </div>`;
  openModal('🎯 Monthly Budgets', html);
}

function saveBudgets() {
  if (!DB.budgets) DB.budgets = {};
  EXP_CATEGORIES.forEach(cat => {
    const safeId = 'budget-' + cat.replace(/\W+/g, '_');
    const el  = document.getElementById(safeId);
    const val = parseFloat(el?.value);
    if (val > 0) DB.budgets[cat] = val;
    else         delete DB.budgets[cat];
  });
  saveDB();
  closeModal();
  showToast('Budgets saved!', 'success');
  renderPage('expenses');
}

// ─── CSV EXPORT ──────────────────────────────────────────────────
function exportExpensesCSV() {
  if (!DB.expenses.length) return showToast('No expenses to export', 'error');
  const header = ['Date', 'Description', 'Category', 'Amount (₹)', 'Account', 'Notes'];
  const rows = [...DB.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(e => [
      e.date || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.category || '',
      e.amount || 0,
      `"${getAccountName(e.accountId).replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `finvault_expenses_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Expenses exported as CSV!', 'success');
}