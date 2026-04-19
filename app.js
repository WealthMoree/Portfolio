/* ─── FINVAULT — CORE APP ENGINE ──────────────────────────────── */
/* app.js — State management, routing, utilities, modal, toast    */

// ─── REAL BRAND LOGOS (SVG, fetched from simple-icons npm pkg) ──
// Source: https://github.com/simple-icons/simple-icons (MIT License)
const BRAND_LOGOS = {
  "Axis Bank": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>Axis Bank</title><path d="M11.978 1.596 0 22.404h7.453l8.265-14.369Zm.027 12.896 4.533 7.903H24l-4.533-7.903z"/></svg>`,
  "HDFC Bank": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>HDFC Bank</title><path d="M.572 0v10.842h3.712V4.485h6.381V0Zm12.413 0v4.485h6.383v6.357h4.06V0Zm-4.64 8.53v6.938h6.963V8.53ZM.572 13.153V24h10.093v-4.486h-6.38v-6.361zm18.796 0v6.361h-6.383V24h10.443V13.153Z"/></svg>`,
  "ICICI Bank": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>ICICI Bank</title><path d="M21.9258 2.0961C19.279-1.6476 12.698-.2426 7.2138 5.2416c-5.484 5.475-7.7865 12.9625-5.1397 16.7062.8728 1.2386 2.1837 1.902 3.7386 2.0522 1.0516.0078 1.9129-1.1846 2.6158-2.7774.7252-1.6678 1.1694-3.218 1.5138-4.6592.5077-2.2934.544-3.934.29-4.2786-.435-.5801-1.4321-.435-2.5561.2176-.544.2991-1.26.0997-.408-.9336.8612-1.0425 4.2605-3.5625 5.4933-3.9523 1.3415-.3898 2.8734.136 2.3568 1.6226-.3706 1.0847-5.0473 13.486-1.596 12.2719 1.1049-.747 2.205-1.6497 3.2639-2.7086 5.4841-5.475 7.7865-12.9625 5.1396-16.7063zm-5.3662 3.209c-1.0969 1.0968-2.52 1.4865-3.1364.852-.6617-.6345-.272-2.0577.8249-3.1726 1.1058-1.115 2.529-1.4594 3.1454-.834.6345.6436.2448 2.0487-.834 3.1545z"/></svg>`,
  "Zerodha": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>Zerodha</title><path d="M20.378 5.835A27.267 27.267 0 0124 12.169V0H13.666c2.486 1.343 4.763 3.308 6.712 5.835zM5.48 1.297c-1.914 0-3.755.409-5.48 1.166V24h22.944C22.766 11.44 15 1.297 5.48 1.297z"/></svg>`,
  "Paytm": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>Paytm</title><path d="M15.85 8.167a.204.204 0 0 0-.04.004c-.68.19-.543 1.148-1.781 1.23h-.12a.23.23 0 0 0-.052.005h-.001a.24.24 0 0 0-.184.235v1.09c0 .134.106.241.237.241h.645v4.623c0 .132.104.238.233.238h1.058a.236.236 0 0 0 .233-.238v-4.623h.6c.13 0 .236-.107.236-.241v-1.09a.239.239 0 0 0-.236-.24h-.612V8.386a.218.218 0 0 0-.216-.22zm4.225 1.17c-.398 0-.762.15-1.042.395v-.124a.238.238 0 0 0-.234-.224h-1.07a.24.24 0 0 0-.236.242v5.92a.24.24 0 0 0 .236.242h1.07c.12 0 .217-.091.233-.209v-4.25a.393.393 0 0 1 .371-.408h.196a.41.41 0 0 1 .226.09.405.405 0 0 1 .145.319v4.074l.004.155a.24.24 0 0 0 .237.241h1.07a.239.239 0 0 0 .235-.23l-.001-4.246c0-.14.062-.266.174-.34a.419.419 0 0 1 .196-.068h.198c.23.02.37.2.37.408.005 1.396.004 2.8.004 4.224a.24.24 0 0 0 .237.241h1.07c.13 0 .236-.108.236-.241v-4.543c0-.31-.034-.442-.08-.577a1.601 1.601 0 0 0-1.51-1.09h-.015a1.58 1.58 0 0 0-1.152.5c-.291-.308-.7-.5-1.153-.5zM.232 9.4A.234.234 0 0 0 0 9.636v5.924c0 .132.096.238.216.241h1.09c.13 0 .237-.107.237-.24l.004-1.658H2.57c.857 0 1.453-.605 1.453-1.481v-1.538c0-.877-.596-1.484-1.453-1.484H.232zm9.032 0a.239.239 0 0 0-.237.241v2.47c0 .94.657 1.608 1.579 1.608h.675s.016 0 .037.004a.253.253 0 0 1 .222.253c0 .13-.096.235-.219.251l-.018.004-.303.006H9.739a.239.239 0 0 0-.236.24v1.09a.24.24 0 0 0 .236.242h1.75c.92 0 1.577-.669 1.577-1.608v-4.56a.239.239 0 0 0-.236-.24h-1.07a.239.239 0 0 0-.236.24c-.005.787 0 1.525 0 2.255a.253.253 0 0 1-.25.25h-.449a.253.253 0 0 1-.25-.255c.005-.754-.005-1.5-.005-2.25a.239.239 0 0 0-.236-.24zm-4.004.006a.232.232 0 0 0-.238.226v1.023c0 .132.113.24.252.24h1.413c.112.017.2.1.213.23v.14c-.013.124-.1.214-.207.224h-.7c-.93 0-1.594.63-1.594 1.515v1.269c0 .88.57 1.506 1.495 1.506h1.94c.348 0 .63-.27.63-.6v-4.136c0-1.004-.508-1.637-1.72-1.637zm-3.713 1.572h.678c.139 0 .25.115.25.256v.836a.253.253 0 0 1-.25.256h-.1c-.192.002-.386 0-.578 0zm4.67 1.977h.445c.139 0 .252.108.252.24v.932a.23.23 0 0 1-.014.076.25.25 0 0 1-.238.164h-.445a.247.247 0 0 1-.252-.24v-.933c0-.132.113-.239.252-.239Z"/></svg>`,
  "PhonePe": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>PhonePe</title><path d="M10.206 9.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072 0-1.609-.536-1.609-1.743V9.941zm13.47 4.816c-1.523 6.449-7.985 10.442-14.433 8.919C2.794 22.154-1.199 15.691.324 9.243 1.847 2.794 8.309-1.199 14.757.324c6.449 1.523 10.442 7.985 8.919 14.433zm-6.231-5.888a.887.887 0 0 0-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021 3.82H6.386c-.201 0-.335.134-.335.335v.67c0 .469.402.871.871.871h.938v3.217c0 2.413 1.273 3.82 3.418 3.82.67 0 1.206-.067 1.877-.335v2.145c0 .603.469 1.072 1.072 1.072h.938a.432.432 0 0 0 .402-.402V9.874h1.542c.201 0 .335-.134.335-.335v-.67z"/></svg>`,
  "Google Pay": `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:currentColor"><title>Google Pay</title><path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z"/></svg>`,
};

// Helper: get brand logo SVG or null
function getBrandLogo(name) {
  if (!name) return null;
  const key = Object.keys(BRAND_LOGOS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? BRAND_LOGOS[key] : null;
}

// ─── STATE ──────────────────────────────────────────────────────
const DB_KEY = 'finvault_db';
let currentModule = 'dashboard';

const DEFAULT_DB = {
  user: null,
  theme: 'light',
  investments: [],
  insurance: [],
  liabilities: [],
  accounts: [],
  expenses: [],
  sips: [],
  ledgers: {},      // key: entity_id, value: []
  sheets: [],       // investment groupings
  budgets: {},      // key: category, value: monthly limit (₹)
};

let DB = {};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    DB = raw ? { ...DEFAULT_DB, ...JSON.parse(raw) } : { ...DEFAULT_DB };
    // Ensure budgets field exists for old data
    if (!DB.budgets) DB.budgets = {};
  } catch(e) {
    DB = { ...DEFAULT_DB };
  }
}

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  } catch(e) {
    showToast('Storage full — please clear some data.', 'error');
  }
}

// ─── ID GENERATOR ──────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── FORMAT HELPERS ─────────────────────────────────────────────
function formatCurrency(amount, compact = false) {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const n = parseFloat(amount);
  if (compact) {
    if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
    if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
    if (Math.abs(n) >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  }
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return dateStr; }
}

function daysBetween(d1, d2) {
  const diff = new Date(d2) - new Date(d1);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function currentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `FY${yr}-${(yr + 1).toString().slice(2)}`;
}

// ─── CALCULATIONS (replaces Python backend) ─────────────────────
const Calc = {
  // FD maturity (compound quarterly)
  fdMaturity(principal, ratePercent, tenureMonths) {
    const r = ratePercent / 100;
    const n = 4; // quarterly compounding
    const t = tenureMonths / 12;
    return principal * Math.pow(1 + r / n, n * t);
  },

  // RD maturity
  rdMaturity(monthlyAmt, ratePercent, tenureMonths) {
    const r = ratePercent / 100 / 4;
    let total = 0;
    for (let i = 1; i <= tenureMonths; i++) {
      total += monthlyAmt * Math.pow(1 + r, (tenureMonths - i + 1) / 3);
    }
    return total;
  },

  // Bond value
  bondCurrentValue(principal, ratePercent, years) {
    return principal * (1 + (ratePercent / 100) * years);
  },

  // PPF/EPF compound (annual, end of FY)
  compoundAnnual(principal, ratePercent, years) {
    return principal * Math.pow(1 + ratePercent / 100, years);
  },

  // SIP future value
  sipFV(monthlyAmt, ratePercent, months) {
    const r = ratePercent / 100 / 12;
    if (r === 0) return monthlyAmt * months;
    return monthlyAmt * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  },

  // Loan EMI
  emi(principal, ratePercent, tenureMonths) {
    if (ratePercent === 0) return principal / tenureMonths;
    const r = ratePercent / 100 / 12;
    return principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1);
  },

  // Loan outstanding
  loanOutstanding(principal, ratePercent, tenureMonths, paidMonths) {
    const r = ratePercent / 100 / 12;
    if (r === 0) return principal - (principal / tenureMonths) * paidMonths;
    const emi = this.emi(principal, ratePercent, tenureMonths);
    return principal * Math.pow(1 + r, paidMonths) - emi * ((Math.pow(1 + r, paidMonths) - 1) / r);
  },

  // Years elapsed from date
  yearsElapsed(dateStr) {
    if (!dateStr) return 0;
    return Math.max(0, (Date.now() - new Date(dateStr)) / (365.25 * 24 * 3600 * 1000));
  },

  // Months elapsed
  monthsElapsed(dateStr) {
    if (!dateStr) return 0;
    const now = new Date();
    const start = new Date(dateStr);
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  }
};

// ─── LEDGER HELPERS ─────────────────────────────────────────────
function getLedger(id) {
  return DB.ledgers[id] || [];
}

function addLedgerEntry(id, entry) {
  if (!DB.ledgers[id]) DB.ledgers[id] = [];
  const e = { id: uid(), date: today(), ...entry, ts: Date.now() };
  DB.ledgers[id].unshift(e);
  saveDB();
  return e;
}

function exportLedger(entityId, entityName) {
  const ledger = getLedger(entityId);
  const data = { entity: entityName, id: entityId, exportedAt: new Date().toISOString(), entries: ledger };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger_${entityName.replace(/\s/g, '_')}_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Ledger exported!', 'success');
}

// ─── NAVIGATION ─────────────────────────────────────────────────
function navigate(module) {
  currentModule = module;
  // Collapse sidebar on navigate
  document.getElementById('sidebar').classList.add('collapsed');
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === module);
  });
  // Render page
  renderPage(module);
}

function renderPage(module) {
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const renderers = {
    dashboard:   renderDashboard,
    investments: renderInvestments,
    insurance:   renderInsurance,
    liabilities: renderLiabilities,
    accounts:    renderAccounts,
    expenses:    renderExpenses,
    sip:         renderSIP,
  };
  if (renderers[module]) renderers[module](main);
}

// ─── SIDEBAR ─────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ─── THEME ──────────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.getElementById('theme-toggle').checked;
  document.getElementById('app-body').className = isDark ? 'dark-mode' : 'light-mode';
  DB.theme = isDark ? 'dark' : 'light';
  saveDB();
}

function applyTheme() {
  if (DB.theme === 'dark') {
    document.getElementById('app-body').className = 'dark-mode';
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = true;
  }
}

// ─── MODAL ──────────────────────────────────────────────────────
function openModal(title, bodyHTML, onOpen) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('global-modal').classList.remove('hidden');
  if (onOpen) onOpen();
}

function closeModal() {
  document.getElementById('global-modal').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

function closeModalOnBg(e) {
  if (e.target.id === 'global-modal') closeModal();
}

// ─── TOAST ──────────────────────────────────────────────────────
function showToast(msg, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '•'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ─── FORM HELPERS ────────────────────────────────────────────────
function validateForm(fields) {
  let valid = true;
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    el.classList.remove('error');
    const val = el.value.trim();
    if (f.required && !val) {
      el.classList.add('error');
      showToast(`${f.name} is required`, 'error');
      valid = false;
    } else if (f.type === 'number') {
      const n = parseFloat(val);
      if (isNaN(n) || n < 0) {
        el.classList.add('error');
        showToast(`${f.name} must be a valid positive number`, 'error');
        valid = false;
      }
      if (f.min !== undefined && n < f.min) {
        el.classList.add('error');
        showToast(`${f.name} must be at least ${f.min}`, 'error');
        valid = false;
      }
    }
  });
  return valid;
}

function getVal(id, asFloat = false) {
  const el = document.getElementById(id);
  if (!el) return asFloat ? 0 : '';
  return asFloat ? parseFloat(el.value) || 0 : el.value.trim();
}

// ─── ACCOUNT SELECT OPTIONS ──────────────────────────────────────
function accountOptions(includeBlank = true) {
  const blank = includeBlank ? '<option value="">— None —</option>' : '';
  return blank + DB.accounts.map(a => `<option value="${a.id}">${escHtml(a.name)} (${a.type})</option>`).join('');
}

function getAccountName(id) {
  if (!id) return '-';
  const a = DB.accounts.find(a => a.id === id);
  return a ? a.name : '-';
}

// ─── ESCAPE HTML ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.escHtml = escHtml;

// ─── MINI BAR CHART ─────────────────────────────────────────────
function renderBarChart(container, data, maxVal) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  container.innerHTML = `<div class="bar-chart">` +
    data.map(d => `
      <div class="bar-col">
        <div class="bar" style="height:${Math.max(4, (d.value / max) * 130)}px; background:${d.color || 'linear-gradient(180deg, var(--accent-light), var(--accent))'}" data-val="${formatCurrency(d.value, true)}"></div>
        <div class="bar-label">${d.label}</div>
      </div>
    `).join('') +
  `</div>`;
}

// ─── DONUT CHART ─────────────────────────────────────────────────
const CHART_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6'];

function renderDonutChart(container, data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) { container.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center">No data</div>'; return; }
  const R = 60, cx = 70, cy = 70, strokeW = 22;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${CHART_COLORS[i % CHART_COLORS.length]}" stroke-width="${strokeW}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return seg;
  });

  container.innerHTML = `
    <div class="pie-chart">
      <div class="pie-ring">
        <svg width="140" height="140" class="pie-svg" style="transform:none">
          ${segments.join('')}
          <circle cx="${cx}" cy="${cy}" r="${R - strokeW/2 - 2}" fill="var(--bg2)"/>
          <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" fill="var(--text2)" font-family="DM Sans">Total</text>
          <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text)" font-family="DM Serif Display">${formatCurrency(total, true)}</text>
        </svg>
      </div>
      <div class="pie-legend">
        ${data.map((d, i) => `
          <div class="pie-legend-item">
            <div class="pie-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
            <span>${escHtml(d.label)}</span>
            <span class="text-muted" style="margin-left:4px">${((d.value/total)*100).toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── USER INIT ──────────────────────────────────────────────────
function initUser() {
  const name = document.getElementById('user-name-input').value.trim();
  if (!name) {
    showToast('Please enter your name', 'error');
    return;
  }
  DB.user = name;
  saveDB();
  startApp();
}

function startApp() {
  document.getElementById('onboarding-overlay').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('sidebar-user-name').textContent = DB.user;
  applyTheme();
  navigate('dashboard');
}

// ─── BOOT ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadDB();
  if (!DB.user) {
    document.getElementById('onboarding-overlay').classList.remove('hidden');
    document.getElementById('user-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') initUser();
    });
  } else {
    startApp();
  }
});