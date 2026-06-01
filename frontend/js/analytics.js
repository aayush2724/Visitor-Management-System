// ─── Auth guard ───
const token = sessionStorage.getItem('secure_auth');
if (!token) window.location.href = '/login.html';

const authFetch = (url, opts = {}) =>
  fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}` } })
    .then(r => { if (r.status === 401) { logout(); throw new Error('Unauthorized'); } return r; });

function logout() {
  sessionStorage.removeItem('secure_auth');
  window.location.href = '/login.html';
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'error' ? '✕' : '✓'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.animation='toast-out .3s ease forwards'; setTimeout(()=>el.remove(),300); }, 3500);
}

// ─── Chart defaults ───
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = '#1e293b';
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.font.size   = 12;

const COLORS = {
  accent:  '#6366f1', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6', purple: '#a78bfa',
  cyan: '#06b6d4', rose: '#f43f5e',
};
const PALETTE = Object.values(COLORS);
const ALPHA   = (hex, a) => hex + Math.round(a*255).toString(16).padStart(2,'0');

let trendsChart = null;
let deptChart   = null;
let typeChart   = null;
let purposeChart = null;
let deptBarChart = null;

function destroyChart(c) { if (c) { try { c.destroy(); } catch(e) {} } }

function getDays() { return parseInt(document.getElementById('trend-days').value) || 30; }

// ─── Load summary ───
async function loadSummary() {
  try {
    const r = await authFetch('/api/analytics/summary');
    const d = await r.json();
    document.getElementById('s-today').textContent = d.today   ?? '—';
    document.getElementById('s-week').textContent  = d.thisWeek ?? '—';
    document.getElementById('s-month').textContent = d.thisMonth ?? '—';
    document.getElementById('s-avg').textContent   = d.avgDurationMinutes ?? '—';
  } catch(e) { console.error('Summary load failed', e); }
}

// ─── Load trends ───
async function loadTrends() {
  try {
    const r = await authFetch(`/api/analytics/trends?days=${getDays()}`);
    const data = await r.json();
    const labels   = data.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-US', {month:'short', day:'numeric'});
    });
    const walkins   = data.map(d => d.walkins);
    const scheduled = data.map(d => d.scheduled);

    destroyChart(trendsChart);
    const ctx = document.getElementById('trends-chart').getContext('2d');
    trendsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Walk-ins',
            data: walkins,
            backgroundColor: ALPHA(COLORS.accent, 0.7),
            borderColor: COLORS.accent,
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Scheduled',
            data: scheduled,
            backgroundColor: ALPHA(COLORS.purple, 0.6),
            borderColor: COLORS.purple,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8', padding: 16, usePointStyle: true } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { stacked: false, grid: { color: '#1e293b' }, ticks: { maxRotation: 45, color: '#64748b', font: {size:10} } },
          y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', stepSize: 1 } },
        },
      },
    });
  } catch(e) { console.error('Trends load failed', e); }
}

// ─── Load by department ───
async function loadDeptCharts() {
  try {
    const r = await authFetch('/api/analytics/by-department');
    const data = await r.json();
    const labels = data.map(d => d.department);
    const counts = data.map(d => d.count);
    const colors = data.map((_, i) => PALETTE[i % PALETTE.length]);

    destroyChart(deptChart);
    const ctx1 = document.getElementById('dept-chart').getContext('2d');
    deptChart = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: counts, backgroundColor: colors.map(c=>ALPHA(c,0.8)), borderColor: colors, borderWidth: 2 }],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 12, usePointStyle: true, font:{size:11} } },
        },
      },
    });

    destroyChart(deptBarChart);
    const ctx2 = document.getElementById('dept-bar-chart').getContext('2d');
    deptBarChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Visitors',
          data: counts,
          backgroundColor: colors.map(c => ALPHA(c,0.75)),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', stepSize: 1 } },
          y: { grid: { display: false }, ticks: { color: '#94a3b8', font:{size:11} } },
        },
      },
    });
  } catch(e) { console.error('Dept load failed', e); }
}

// ─── Load visitor types ───
async function loadTypeChart() {
  try {
    const r = await authFetch('/api/analytics/by-type');
    const data = await r.json();
    const labels = data.map(d => d.type);
    const counts = data.map(d => d.count);
    const colors = data.map((_, i) => PALETTE[i % PALETTE.length]);

    destroyChart(typeChart);
    const ctx = document.getElementById('type-chart').getContext('2d');
    typeChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data: counts, backgroundColor: colors.map(c=>ALPHA(c,0.8)), borderColor: colors, borderWidth: 2 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 10, usePointStyle: true, font:{size:10} } } },
      },
    });
  } catch(e) {}
}

// ─── Load purpose chart ───
async function loadPurposeChart() {
  try {
    const r = await authFetch('/api/analytics/by-purpose');
    const data = await r.json();
    const labels = data.map(d => d.purpose);
    const counts = data.map(d => d.count);
    const colors = [COLORS.green, COLORS.accent, COLORS.amber, COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.rose, COLORS.red];

    destroyChart(purposeChart);
    const ctx = document.getElementById('purpose-chart').getContext('2d');
    purposeChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data: counts, backgroundColor: colors.map(c=>ALPHA(c,0.8)), borderColor: colors, borderWidth: 2 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 10, usePointStyle: true, font:{size:10} } } },
      },
    });
  } catch(e) {}
}

// ─── Load peak hours ───
async function loadHoursHeatmap() {
  try {
    const r = await authFetch('/api/analytics/by-hour');
    const data = await r.json();
    const maxCount = Math.max(...data.map(d => d.count), 1);

    const grid   = document.getElementById('hours-grid');
    const labels = document.getElementById('hours-labels');
    grid.innerHTML   = '';
    labels.innerHTML = '';

    const timeLabels = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a',
                        '12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];

    data.forEach((d, i) => {
      const intensity = d.count / maxCount;
      const cell = document.createElement('div');
      cell.className = 'hour-cell';
      const alpha = Math.max(0.05, intensity);
      cell.style.background = `rgba(99,102,241,${alpha})`;
      cell.innerHTML = `<div class="tooltip">${timeLabels[i]}: ${d.count} visits</div>`;
      grid.appendChild(cell);
    });

    [0,4,8,12,16,20].forEach(h => {
      const label = document.createElement('div');
      label.className = 'hour-label';
      label.style.gridColumn = `${h+1} / span 4`;
      label.textContent = timeLabels[h];
      labels.appendChild(label);
    });
  } catch(e) {}
}

// ─── Load repeat visitors ───
async function loadRepeatVisitors() {
  try {
    const r = await authFetch('/api/analytics/repeat-visitors');
    const data = await r.json();
    const list = document.getElementById('repeat-list');

    if (!data.length) {
      list.innerHTML = `<li style="color:var(--text-muted);font-size:0.82rem;padding:16px 0;text-align:center;">No repeat visitors yet</li>`;
      return;
    }

    list.innerHTML = data.map((v, i) => `
      <li class="repeat-item">
        <div class="repeat-rank">${i+1}</div>
        <div class="repeat-info">
          <div class="repeat-name">${v.name}</div>
          <div class="repeat-phone">${v.phone}</div>
        </div>
        <div>
          <div class="repeat-count">${v.visits}</div>
          <div class="repeat-sub">visits</div>
        </div>
      </li>
    `).join('');
  } catch(e) {}
}

// ─── Export ───
function exportReport() {
  const params = new URLSearchParams({ period: 'all', token });
  fetch(`/api/visitors/export?${params}`)
    .then(r => r.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SECURE_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      toast('Report exported');
    }).catch(() => toast('Export failed', 'error'));
}

// ─── Re-load on days change ───
document.getElementById('trend-days').addEventListener('change', loadTrends);

// ─── Init ───
async function init() {
  await Promise.all([
    loadSummary(),
    loadTrends(),
    loadDeptCharts(),
    loadTypeChart(),
    loadPurposeChart(),
    loadHoursHeatmap(),
    loadRepeatVisitors(),
  ]);
}

init();
