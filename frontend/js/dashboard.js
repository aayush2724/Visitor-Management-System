// — Secure Auth Guard —
const token = sessionStorage.getItem('secure_auth');
if (!token) {
  window.location.href = '/login.html';
}

// Wrapper to inject auth header
const authFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  }).then(res => {
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  });
};

// Toast notification to replace ugly alerts
function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: ${isError ? '#ff4444' : '#00e5ff'};
    color: ${isError ? 'white' : '#07090e'};
    padding: 12px 24px; border-radius: 4px;
    font-family: 'Orbitron', sans-serif; font-weight: bold;
    z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transition: opacity 0.3s;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function logout() {
  sessionStorage.removeItem('secure_auth');
  window.location.href = '/login.html';
}

let currentStatus = 'all';
let allVisitors = [];
let searchTerm = '';

// SSE for live updates
let es = new EventSource('/api/visitors/updates');
es.onmessage = () => { loadStats(); loadVisitors(); };

// Cleanup SSE when tab is hidden to save connections
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (es) { es.close(); es = null; }
  } else {
    if (!es) {
      es = new EventSource('/api/visitors/updates');
      es.onmessage = () => { loadStats(); loadVisitors(); };
      loadStats();
      loadVisitors();
    }
  }
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStatus = tab.dataset.status;
    loadVisitors();
  });
});

// Search
document.getElementById('search-input').addEventListener('input', e => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderTable();
});

function loadStats() {
  authFetch('/api/visitors/stats').then(r => r.json()).then(s => {
    document.getElementById('stat-total').textContent    = s.total    || 0;
    document.getElementById('stat-active').textContent   = s.active   || 0;
    document.getElementById('stat-released').textContent = s.released || 0;
    document.getElementById('stat-scheduled').textContent = s.scheduled || 0;
  }).catch(console.error);
}

function loadVisitors() {
  const url = currentStatus === 'all' ? '/api/visitors' : `/api/visitors?status=${currentStatus}`;
  authFetch(url).then(r => {
    if (!r.ok) throw new Error('Server error');
    return r.json();
  }).then(visitors => {
    allVisitors = visitors;
    renderTable();
  }).catch(err => {
    document.getElementById('visitor-tbody').innerHTML =
      `<tr class="empty-row"><td colspan="6">[ ERROR: ${err.message} ]</td></tr>`;
  });
}

function renderTable() {
  const tbody = document.getElementById('visitor-tbody');
  const filtered = searchTerm
    ? allVisitors.filter(v => v.full_name.toLowerCase().includes(searchTerm))
    : allVisitors;

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">[ NO RECORDS FOUND ]</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    // Badge
    let badge;
    if (v.scheduled)            badge = `<span class="badge badge-scheduled">SCHEDULED</span>`;
    else if (v.security_confirmed) badge = `<span class="badge badge-released">CHECKED OUT</span>`;
    else if (v.out_time)        badge = `<span class="badge badge-pending">EXIT PENDING</span>`;
    else                        badge = `<span class="badge badge-active">ON-SITE</span>`;

    // Action buttons
    let actions = '';
    if (v.scheduled)
      actions += `<button class="act-btn act-allow" data-id="${v.id}" onclick="allowEntry('${v.id}')">ALLOW IN</button>`;
    else if (!v.out_time && v.approved)
      actions += `<button class="act-btn act-release" onclick="releaseVisitor('${v.id}')">RELEASE</button>`;
    else if (!v.out_time)
      actions += `<button class="act-btn act-checkout" onclick="checkoutVisitor('${v.id}')">CHECK OUT</button>`;
    else if (!v.security_confirmed)
      actions += `<button class="act-btn act-security" onclick="securityCheckout('${v.id}')">CONFIRM EXIT</button>`;
    actions += `<button class="act-btn act-delete" onclick="deleteVisitor('${v.id}', this)">&#10005;</button>`;

    // Photo
    const photoEl = v.photo_path
      ? `<img src="${v.photo_path}" class="vis-thumb" alt="photo">`
      : `<div class="vis-thumb-placeholder">N/A</div>`;

    // Times
    const inT  = new Date(v.in_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const outT = v.out_time ? new Date(v.out_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--';
    const dateStr = new Date(v.in_time).toLocaleDateString();

    return `<tr>
      <td>
        <div class="vis-name">
          ${photoEl}
          <div>
            <div class="vis-name-text">${v.full_name}</div>
            <div class="vis-id">${dateStr} · #${v.id.slice(-6)}</div>
          </div>
        </div>
      </td>
      <td><span style="font-family:'Share Tech Mono',monospace;font-size:0.85rem;">${v.contact_number}</span></td>
      <td>
        <div>${v.department_visiting}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">&#8594; ${v.person_to_visit}</div>
      </td>
      <td>
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:var(--green)">IN&nbsp; ${inT}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:var(--text-muted)">OUT ${outT}</div>
      </td>
      <td>${badge}</td>
      <td><div class="actions-cell">${actions}</div></td>
    </tr>`;
  }).join('');
}

function checkoutVisitor(id) {
  if (!confirm('Mark this visitor as checked out?')) return;
  authFetch(`/api/visitors/${id}/checkout`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); showToast('Checked out successfully'); })
    .catch(() => showToast('Checkout failed', true));
}

function releaseVisitor(id) {
  if (!confirm('Release this visitor?')) return;
  authFetch(`/api/visitors/${id}/release`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); showToast('Visitor released'); })
    .catch(() => showToast('Release failed', true));
}

function securityCheckout(id) {
  if (!confirm('Confirm security exit?')) return;
  authFetch(`/api/visitors/${id}/security-checkout`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); showToast('Security exit confirmed'); })
    .catch(() => showToast('Security checkout failed', true));
}

function allowEntry(id) {
  authFetch(`/api/visitors/${id}/allow-entry`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); showToast('Entry allowed'); })
    .catch(() => showToast('Allow entry failed', true));
}

function deleteVisitor(id, btn) {
  if (!confirm('Permanently delete this visitor record?')) return;
  const row = btn.closest('tr');
  row.style.opacity = '0.4';
  authFetch(`/api/visitors/${id}`, {method:'DELETE'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); showToast('Record deleted'); })
    .catch(() => { showToast('Delete failed', true); row.style.opacity = '1'; });
}

function downloadExcel(period) {
  authFetch(`/api/visitors/export?period=${period}&token=${token}`)
    .then(r => r.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SECURE_VisitorLOG_${period.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
    }).catch(err => showToast('Export Error: ' + err.message, true));
}

loadStats();
loadVisitors();
