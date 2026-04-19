/* ─── DASHBOARD MODULE ─────────────────────────────────────────── */

function renderDashboard(container) {
  // Calculate all totals
  const totalInvested = DB.investments.reduce((s, inv) => s + getInvestmentPrincipal(inv), 0);
  const totalCurrentValue = DB.investments.reduce((s, inv) => s + getInvestmentCurrentValue(inv), 0);
  const totalLiabilities = getTotalLiabilities();
  const totalInsurance = DB.insurance.reduce((s, ins) => s + (parseFloat(ins.premium) || 0), 0);
  const netWorth = totalCurrentValue - totalLiabilities;
  const monthExpenses = getMonthlyExpenses();
  const thisMonthExp = monthExpenses[monthExpenses.length - 1]?.total || 0;

  // Category breakdown for investments
  const invByType = {};
  DB.investments.forEach(inv => {
    invByType[inv.type] = (invByType[inv.type] || 0) + getInvestmentCurrentValue(inv);
  });

  container.innerHTML = `
    <!-- Networth Hero -->
    <div class="networth-hero">
      <div class="networth-label">Net Worth</div>
      <div class="networth-amount">${formatCurrency(netWorth)}</div>
      <div style="font-size:0.82rem;opacity:0.5">as of ${formatDate(today())}</div>
      <div class="networth-sub">
        <div class="networth-sub-item">
          <div class="nl">Total Assets</div>
          <div class="nv">${formatCurrency(totalCurrentValue, true)}</div>
        </div>
        <div class="networth-sub-item">
          <div class="nl">Total Liabilities</div>
          <div class="nv">${formatCurrency(totalLiabilities, true)}</div>
        </div>
        <div class="networth-sub-item">
          <div class="nl">This Month Expenses</div>
          <div class="nv">${formatCurrency(thisMonthExp, true)}</div>
        </div>
        <div class="networth-sub-item">
          <div class="nl">Investments</div>
          <div class="nv">${DB.investments.length}</div>
        </div>
      </div>
    </div>

    <!-- Stat Grid -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Invested</div>
        <div class="stat-value">${formatCurrency(totalInvested, true)}</div>
        <div class="stat-change">${DB.investments.length} holdings</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current Value</div>
        <div class="stat-value">${formatCurrency(totalCurrentValue, true)}</div>
        <div class="stat-change ${totalCurrentValue >= totalInvested ? 'up' : 'down'}">
          ${totalInvested > 0 ? (((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(2) + '% returns' : '—'}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Liabilities</div>
        <div class="stat-value">${formatCurrency(totalLiabilities, true)}</div>
        <div class="stat-change">${DB.liabilities.length} loans</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Annual Premiums</div>
        <div class="stat-value">${formatCurrency(totalInsurance, true)}</div>
        <div class="stat-change">${DB.insurance.length} policies</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:24px">
      <!-- Investment Distribution -->
      <div class="chart-wrap">
        <div class="chart-title">Investment Distribution</div>
        <div id="inv-donut"></div>
      </div>

      <!-- Monthly Expenses -->
      <div class="chart-wrap">
        <div class="chart-title">Monthly Expenses (Last 6 Months)</div>
        <div id="exp-bar"></div>
      </div>
    </div>

    <div class="two-col">
      <!-- Upcoming SIPs -->
      <div class="card">
        <div class="section-title" style="font-size:0.85rem">Upcoming SIPs</div>
        ${renderUpcomingSIPsWidget()}
      </div>

      <!-- Recent Expenses -->
      <div class="card">
        <div class="section-title" style="font-size:0.85rem">Recent Expenses</div>
        ${renderRecentExpensesWidget()}
      </div>
    </div>

    <!-- Loan Progress -->
    ${DB.liabilities.length ? `
    <div class="card" style="margin-top:24px">
      <div class="section-title" style="font-size:0.85rem">Loan Progress</div>
      ${renderLoanProgressWidget()}
    </div>` : ''}
  `;

  // Render charts
  const invDonut = document.getElementById('inv-donut');
  if (Object.keys(invByType).length) {
    renderDonutChart(invDonut, Object.entries(invByType).map(([k, v]) => ({ label: k, value: v })));
  } else {
    invDonut.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Add investments to see distribution</p></div>';
  }

  const expBar = document.getElementById('exp-bar');
  if (monthExpenses.length) {
    renderBarChart(expBar, monthExpenses.slice(-6).map(m => ({ label: m.month, value: m.total })));
  } else {
    expBar.innerHTML = '<div class="empty-state"><div class="empty-icon">💸</div><p>No expenses tracked yet</p></div>';
  }
}

function getMonthlyExpenses() {
  const monthly = {};
  DB.expenses.forEach(exp => {
    if (!exp.date) return;
    const d = new Date(exp.date);
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthly[key] = (monthly[key] || 0) + (parseFloat(exp.amount) || 0);
  });
  return Object.entries(monthly).map(([month, total]) => ({ month, total }));
}

function getTotalLiabilities() {
  return DB.liabilities.reduce((s, l) => {
    const paid = parseFloat(l.paidMonths) || 0;
    const tenure = parseFloat(l.tenureMonths) || 1;
    const principal = parseFloat(l.amount) || 0;
    const rate = parseFloat(l.interestRate) || 0;
    if (paid >= tenure) return s;
    return s + Math.max(0, Calc.loanOutstanding(principal, rate, tenure, paid));
  }, 0);
}

function renderUpcomingSIPsWidget() {
  const active = DB.sips.filter(s => s.status === 'active').slice(0, 4);
  if (!active.length) return '<div class="text-muted" style="font-size:0.85rem;padding:8px 0">No active SIPs</div>';
  return active.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:0.88rem">${escHtml(s.schemeName)}</div>
        <div class="text-muted" style="font-size:0.75rem">${s.frequency} · ${formatDate(s.nextDate)}</div>
      </div>
      <div class="mono" style="font-size:0.88rem;font-weight:600">${formatCurrency(s.amount)}</div>
    </div>
  `).join('');
}

function renderRecentExpensesWidget() {
  const recent = [...DB.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (!recent.length) return '<div class="text-muted" style="font-size:0.85rem;padding:8px 0">No expenses yet</div>';
  return recent.map(exp => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:0.88rem">${escHtml(exp.description || 'Expense')}</div>
        <div class="text-muted" style="font-size:0.75rem">${exp.category} · ${formatDate(exp.date)}</div>
      </div>
      <div class="text-danger mono" style="font-size:0.88rem;font-weight:600">−${formatCurrency(exp.amount)}</div>
    </div>
  `).join('');
}

function renderLoanProgressWidget() {
  return DB.liabilities.slice(0, 4).map(l => {
    const paid = parseFloat(l.paidMonths) || 0;
    const tenure = parseFloat(l.tenureMonths) || 1;
    const pct = Math.min(100, (paid / tenure) * 100);
    const outstanding = Math.max(0, Calc.loanOutstanding(parseFloat(l.amount), parseFloat(l.interestRate) || 0, tenure, paid));
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <div>
            <span style="font-weight:600;font-size:0.9rem">${escHtml(l.name)}</span>
            <span class="text-muted" style="font-size:0.78rem;margin-left:8px">${pct.toFixed(0)}% paid</span>
          </div>
          <span class="mono text-danger" style="font-size:0.88rem">Outstanding: ${formatCurrency(outstanding, true)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.escHtml = escHtml;