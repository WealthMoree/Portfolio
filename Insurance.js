/* ─── INSURANCE MODULE ─────────────────────────────────────────── */

const INS_TYPES = ['Term Life', 'Health', 'Car', 'Bike', 'Home', 'Travel', 'Endowment', 'ULIP', 'Other'];

// ─── LOGO FETCHING ─────────────────────────────────────────────

// Probe a URL by loading it as an image (avoids CORS issues with fetch HEAD)
function probeImageUrl(url) {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, 4000);
    img.onload  = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

const logoCache = {};

async function fetchCompanyLogo(companyName) {
  if (!companyName) return null;
  const key = companyName.trim().toLowerCase();
  if (logoCache[key] !== undefined) return logoCache[key];

  // Longer / more-specific entries must come FIRST so "hdfc bank" wins over bare "hdfc"
  const knownDomains = {
    'hdfc bank': 'hdfcbank.com',
    'hdfc life': 'hdfclife.com',
    'hdfc ergo': 'hdfcergo.com',
    'icici bank': 'icicibank.com',
    'icici prudential': 'iciciprulife.com',
    'icici lombard': 'icicilombard.com',
    'sbi life': 'sbilife.co.in',
    'sbi card': 'sbicard.com',
    'state bank of india': 'sbi.co.in',
    'state bank': 'sbi.co.in',
    'kotak mahindra bank': 'kotak.com',
    'kotak mahindra': 'kotak.com',
    'kotak life': 'kotaklife.com',
    'kotak bank': 'kotak.com',
    'axis bank': 'axisbank.com',
    'idfc first bank': 'idfcfirstbank.com',
    'idfc first': 'idfcfirstbank.com',
    'idfc bank': 'idfcfirstbank.com',
    'indusind bank': 'indusind.com',
    'yes bank': 'yesbank.in',
    'rbl bank': 'rblbank.com',
    'federal bank': 'federalbank.co.in',
    'karnataka bank': 'karnatakabank.com',
    'south indian bank': 'southindianbank.com',
    'bandhan bank': 'bandhanbank.com',
    'bank of baroda': 'bankofbaroda.in',
    'bank of india': 'bankofindia.co.in',
    'bank of maharashtra': 'bankofmaharashtra.in',
    'canara bank': 'canarabank.in',
    'union bank of india': 'unionbankofindia.co.in',
    'union bank': 'unionbankofindia.co.in',
    'punjab national bank': 'pnbindia.in',
    'central bank of india': 'centralbankofindia.co.in',
    'indian bank': 'indianbank.in',
    'indian overseas bank': 'iob.in',
    'uco bank': 'ucobank.in',
    'idbi bank': 'idbibank.com',
    'life insurance corporation': 'licindia.in',
    'lic of india': 'licindia.in',
    'bajaj allianz life': 'bajajallianzlife.com',
    'bajaj allianz': 'bajajallianz.com',
    'tata aia life': 'tataaia.com',
    'tata aia': 'tataaia.com',
    'max life insurance': 'maxlifeinsurance.com',
    'max life': 'maxlifeinsurance.com',
    'aditya birla sun life': 'adityabirlacapital.com',
    'aditya birla': 'adityabirlacapital.com',
    'star health': 'starhealth.in',
    'niva bupa': 'nivabupa.com',
    'care health': 'careinsurance.com',
    'religare health': 'careinsurance.com',
    'new india assurance': 'newindia.co.in',
    'united india': 'uiic.co.in',
    'national insurance': 'nationalinsurance.nic.co.in',
    'oriental insurance': 'orientalinsurance.org.in',
    'cholamandalam': 'chola.in',
    'future generali': 'futuregenerali.in',
    'iffco tokio': 'iffcotokio.co.in',
    'royal sundaram': 'royalsundaram.in',
    'go digit': 'godigit.com',
    'digit insurance': 'godigit.com',
    'acko': 'acko.com',
    'reliance general': 'reliancegeneral.co.in',
    // Short aliases LAST — only match if nothing longer matched
    'pnb': 'pnbindia.in',
    'sbi': 'sbi.co.in',
    'hdfc': 'hdfcbank.com',
    'icici': 'icicibank.com',
    'kotak': 'kotak.com',
    'axis': 'axisbank.com',
    'idfc': 'idfcfirstbank.com',
    'indusind': 'indusind.com',
    'idbi': 'idbibank.com',
    'lic': 'licindia.in',
    'bajaj': 'bajajallianz.com',
    'digit': 'godigit.com',
    'paytm': 'paytm.com',
    'phonepe': 'phonepe.com',
  };

  // Best-match: longest key that matches wins (most specific)
  let domain = null;
  let bestLen = 0;
  for (const [name, d] of Object.entries(knownDomains)) {
    if (key === name || key.includes(name) || name.includes(key)) {
      if (name.length > bestLen) { domain = d; bestLen = name.length; }
    }
  }

  // Build candidate URLs — use img probe instead of fetch HEAD (avoids CORS)
  const candidates = [];
  if (domain) {
    candidates.push(`https://logo.clearbit.com/${domain}`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  const slug = key
    .replace(/\s+(bank|insurance|life|health|general|assurance|limited|ltd|pvt|co|of|india)\b/g, '')
    .replace(/\s+/g, '');
  if (slug) {
    candidates.push(`https://logo.clearbit.com/${slug}.com`);
    candidates.push(`https://logo.clearbit.com/${slug}.in`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`);
  }

  for (const url of candidates) {
    const ok = await probeImageUrl(url);
    if (ok) { logoCache[key] = url; return url; }
  }

  logoCache[key] = null;
  return null;
}

function companyLogoHtml(company, size = 36) {
  const initials = (company || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const cached = logoCache[(company||'').toLowerCase()];

  if (cached) {
    return `<img src="${cached}" alt="${escHtml(company)}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;background:#fff;padding:2px"
      onerror="this.parentNode.innerHTML=\`<div style='width:${size}px;height:${size}px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:${Math.floor(size*0.35)}px'>${initials}</div>\`">`;
  }

  // Return initials placeholder, then async-swap when logo loads
  const domId = 'logo-' + Math.random().toString(36).slice(2);
  const placeholder = `<div id="${domId}" style="width:${size}px;height:${size}px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:${Math.floor(size*0.35)}px;flex-shrink:0">${initials}</div>`;

  if (company) {
    fetchCompanyLogo(company).then(url => {
      const el = document.getElementById(domId);
      if (el && url) {
        el.outerHTML = `<img src="${url}" alt="${escHtml(company)}" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;background:#fff;padding:2px;flex-shrink:0"
          onerror="this.style.display='none'">`;
      }
    });
  }
  return placeholder;
}

// ─── RENDER ─────────────────────────────────────────────────────
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
          <div style="display:flex;align-items:center;gap:10px">
            ${companyLogoHtml(ins.company, 28)}
            <div><strong>${escHtml(ins.name)}</strong> <span class="text-muted" style="font-size:0.78rem">— ${escHtml(ins.company)}</span></div>
          </div>
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

  const coverageByType = {}, premiumByType = {};
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
    const isExpiring = days !== null && days >= 0 && days <= 30;
    const isExpired = days !== null && days < 0;

    return `
      <div class="inv-card" onclick="openInsuranceLedger('${ins.id}')">
        <div class="inv-card-header">
          <div style="display:flex;align-items:center;gap:10px">
            ${companyLogoHtml(ins.company, 36)}
            <div>
              <div class="inv-name" style="margin-bottom:2px">${escHtml(ins.name)}</div>
              <div class="text-muted" style="font-size:0.78rem">${escHtml(ins.company)}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:flex-start" onclick="event.stopPropagation()">
            ${isExpiring ? '<span class="badge badge-yellow">⚠ Renew</span>' : ''}
            ${isExpired ? '<span class="badge badge-red">Expired</span>' : ''}
            <button class="btn-icon btn-sm" onclick="editInsurance('${ins.id}')">✏️</button>
            <button class="btn-icon btn-sm" onclick="deleteInsurance('${ins.id}')">🗑️</button>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px">
          <span class="badge badge-blue">${escHtml(ins.type)}</span>
          ${ins.frequency ? `<span class="badge" style="background:var(--bg3);color:var(--text2)">${escHtml(ins.frequency)}</span>` : ''}
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
            <span class="value ${isExpiring ? 'text-warning' : isExpired ? 'text-danger' : ''}">${formatDate(ins.renewalDate)}</span>
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
        <label class="form-label">Insurance Company *</label>
        <input class="form-input" id="ins-company" placeholder="e.g. LIC, HDFC Life, Star Health" value="${v('company')}"
          oninput="previewInsLogo(this.value)">
        <div id="ins-logo-preview" style="margin-top:8px;display:flex;align-items:center;gap:8px;min-height:36px">
          ${ins?.company ? companyLogoHtml(ins.company, 36) + `<span style="font-size:0.82rem;color:var(--text2)">${escHtml(ins.company)}</span>` : ''}
        </div>
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

let logoDebounceTimer = null;
function previewInsLogo(name) {
  clearTimeout(logoDebounceTimer);
  logoDebounceTimer = setTimeout(async () => {
    const preview = document.getElementById('ins-logo-preview');
    if (!preview || !name.trim()) { if (preview) preview.innerHTML = ''; return; }
    preview.innerHTML = `<span style="font-size:0.78rem;color:var(--text3)">Looking up logo…</span>`;
    const url = await fetchCompanyLogo(name);
    if (!preview) return;
    if (url) {
      preview.innerHTML = `<img src="${url}" style="width:36px;height:36px;object-fit:contain;border-radius:8px;background:#fff;padding:2px" onerror="this.remove()">
        <span style="font-size:0.82rem;color:var(--text2)">${escHtml(name)}</span>`;
    } else {
      const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const color = ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ef4444'][initials.charCodeAt(0)%5];
      preview.innerHTML = `<div style="width:36px;height:36px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:13px">${initials}</div>
        <span style="font-size:0.82rem;color:var(--text2)">${escHtml(name)} <span style="color:var(--text3)">(logo not found, initials shown)</span></span>`;
    }
  }, 600);
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
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      ${companyLogoHtml(ins.company, 48)}
      <div>
        <div style="font-size:1rem;font-weight:700">${escHtml(ins.name)}</div>
        <div class="text-muted" style="font-size:0.82rem">${escHtml(ins.company)}</div>
      </div>
    </div>
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
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th></th></tr></thead>
          <tbody>${ledger.map(e => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${escHtml(e.description)}</td>
              <td class="mono text-danger">−${formatCurrency(e.amount)}</td>
              <td><button class="btn-ghost btn-sm" onclick="editLedgerEntry('${id}','${e.id}','insurance')">✏️</button></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>` : '<div class="text-muted" style="text-align:center;padding:20px">No entries yet</div>'}
  `;
  openModal(`🛡 ${ins.name}`, html);
}
