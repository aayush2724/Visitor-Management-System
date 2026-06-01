// ─── Auth guard ───
const token = sessionStorage.getItem('secure_auth');
if (!token) window.location.href = '/login.html';

const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
  }).then(res => {
    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
    return res;
  });

function logout() {
  sessionStorage.removeItem('secure_auth');
  window.location.href = '/login.html';
}

// ─── Toast ───
function toast(msg, type = 'success') {
  const c = document.getElementById('toasts');
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || '•'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ─── State ───
let currentStatus = 'all';
let allVisitors   = [];
let searchTerm    = '';
let dateFrom      = '';
let dateTo        = '';
let selectedIds   = new Set();
let flagTargetId  = null;

// ─── SSE ───
let es = null;
function connectSSE() {
  if (es) return;
  es = new EventSource('/api/visitors/updates');
  es.onmessage = () => { loadStats(); loadVisitors(); loadActivity(); };
  es.onerror   = () => { if (es) { es.close(); es = null; } setTimeout(connectSSE, 5000); };
}
connectSSE();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (es) { es.close(); es = null; } }
  else { connectSSE(); loadStats(); loadVisitors(); loadActivity(); }
});

// ─── Export dropdown ───
const exportBtn  = document.getElementById('export-btn');
const exportDrop = document.getElementById('export-dropdown');
exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportDrop.classList.toggle('open');
});
document.addEventListener('click', () => exportDrop.classList.remove('open'));

// ─── Tabs ───
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStatus = tab.dataset.status;
    loadVisitors();
  });
});

// ─── Search ───
document.getElementById('search-input').addEventListener('input', e => {
  searchTerm = e.target.value.trim();
  renderTable();
});

// ─── Date filter ───
document.getElementById('date-from').addEventListener('change', e => {
  dateFrom = e.target.value;
  document.getElementById('clear-dates').style.display = (dateFrom || dateTo) ? 'inline-flex' : 'none';
  loadVisitors();
});
document.getElementById('date-to').addEventListener('change', e => {
  dateTo = e.target.value;
  document.getElementById('clear-dates').style.display = (dateFrom || dateTo) ? 'inline-flex' : 'none';
  loadVisitors();
});
document.getElementById('clear-dates').addEventListener('click', () => {
  dateFrom = ''; dateTo = '';
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
  document.getElementById('clear-dates').style.display = 'none';
  loadVisitors();
});

// ─── Select all ───
document.getElementById('select-all').addEventListener('change', function() {
  const checkboxes = document.querySelectorAll('.row-check');
  checkboxes.forEach(cb => {
    cb.checked = this.checked;
    const id = cb.dataset.id;
    if (this.checked) selectedIds.add(id);
    else selectedIds.delete(id);
  });
  updateBulkBar();
});

function updateBulkBar() {
  const bar   = document.getElementById('bulk-bar');
  const count = document.getElementById('bulk-count');
  if (selectedIds.size > 0) {
    bar.classList.add('show');
    count.textContent = selectedIds.size;
  } else {
    bar.classList.remove('show');
  }
}

function clearSelection() {
  selectedIds.clear();
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  document.getElementById('select-all').checked = false;
  updateBulkBar();
}

// ─── Load stats ───
function loadStats() {
  authFetch('/api/visitors/stats')
    .then(r => r.json())
    .then(s => {
      document.getElementById('stat-total').textContent    = s.total    ?? '—';
      document.getElementById('stat-active').textContent   = s.active   ?? '—';
      document.getElementById('stat-released').textContent = s.released ?? '—';
      document.getElementById('stat-pending').textContent  = s.security_pending ?? '—';
      document.getElementById('stat-flagged').textContent  = s.flagged  ?? '—';
      document.getElementById('tab-count-all').textContent    = s.total ?? 0;
      document.getElementById('tab-count-active').textContent = s.active ?? 0;
    }).catch(console.error);
}

// ─── Load visitors ───
function loadVisitors() {
  let url = '/api/visitors';
  const params = new URLSearchParams();
  if (currentStatus !== 'all') params.set('status', currentStatus);
  if (searchTerm) params.set('search', searchTerm);
  if (dateFrom)   params.set('from', dateFrom);
  if (dateTo)     params.set('to', dateTo + 'T23:59:59');
  if ([...params].length) url += '?' + params.toString();

  authFetch(url)
    .then(r => { if (!r.ok) throw new Error('Server error'); return r.json(); })
    .then(visitors => {
      allVisitors = visitors;
      clearSelection();
      renderTable();
    })
    .catch(err => {
      document.getElementById('visitor-tbody').innerHTML =
        `<tr><td colspan="8" class="empty-state-s">Error loading data</td></tr>`;
    });
}

// ─── Load activity ───
function loadActivity() {
  authFetch('/api/analytics/recent-activity?limit=15')
    .then(r => r.json())
    .then(activities => {
      const feed = document.getElementById('activity-feed');
      if (!activities.length) {
        feed.innerHTML = `<div class="p-md text-on-surface-variant text-[11px] font-code-snippet uppercase tracking-widest opacity-50">No recent activity</div>`;
        return;
      }
      const dotColors = { checkin:'bg-secondary', checkout:'bg-primary-container', exit:'bg-outline', approved:'bg-secondary' };
      feed.innerHTML = activities.slice(0, 12).map(a => `
        <div class="flex items-center justify-between p-sm hover:bg-white/[0.02] transition-colors">
          <div class="flex items-center gap-md">
            <div class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 border border-outline-variant/20">
              <span class="material-symbols-outlined text-[13px] ${a.type === 'checkin' ? 'text-secondary' : 'text-on-surface-variant'}">${a.type === 'checkin' ? 'login' : 'logout'}</span>
            </div>
            <div>
              <div class="text-sm font-medium text-on-surface">${a.visitor}</div>
              <div class="text-[10px] text-on-surface-variant font-code-snippet">${a.detail}${a.dept ? ' · ' + a.dept : ''}</div>
            </div>
          </div>
          <div class="text-[10px] font-code-snippet ${a.type === 'checkin' ? 'text-secondary' : 'text-on-surface-variant opacity-60'} flex-shrink-0">${formatTime(a.time)}</div>
        </div>
      `).join('');
    }).catch(() => {});
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString();
}

// ─── Render table ───
function renderTable() {
  const tbody = document.getElementById('visitor-tbody');
  const filtered = searchTerm
    ? allVisitors.filter(v => {
        const s = searchTerm.toLowerCase();
        return (v.full_name||'').toLowerCase().includes(s)
          || (v.contact_number||'').includes(s)
          || (v.department_visiting||'').toLowerCase().includes(s)
          || (v.person_to_visit||'').toLowerCase().includes(s)
          || (v.badge_number||'').toLowerCase().includes(s);
      })
    : allVisitors;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state-s">No visitors found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const id = v.id || v._id;
    const isChecked = selectedIds.has(id);

    // Status badge — uses sentinel.css classes
    let badge;
    if (v.is_flagged)               badge = `<span class="s-badge badge-flagged">Flagged</span>`;
    else if (v.scheduled)          badge = `<span class="s-badge badge-scheduled">Scheduled</span>`;
    else if (v.security_confirmed) badge = `<span class="s-badge badge-released">Completed</span>`;
    else if (v.out_time)           badge = `<span class="s-badge badge-pending">Pending Exit</span>`;
    else                           badge = `<span class="s-badge badge-active">On-Site</span>`;

    // Repeat label
    const repeatFlag = v.is_repeat ? `<div class="repeat-flag">↩ ${v.visit_count}x visitor</div>` : '';

    // Avatar
    const initials = (v.full_name || 'VV').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const avatar = v.photo_path
      ? `<img src="${v.photo_path}" class="v-avatar" alt="photo">`
      : `<div class="v-avatar-initials">${initials}</div>`;

    // Times
    const inT  = v.in_time  ? new Date(v.in_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})  : '—';
    const outT = v.out_time ? new Date(v.out_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—';
    const dateStr = v.in_time ? new Date(v.in_time).toLocaleDateString([], {month:'short',day:'numeric'}) : '';

    // Actions — Tailwind micro-buttons
    const btnBase = 'inline-flex items-center gap-[3px] px-[8px] py-[3px] rounded text-[10px] font-code-snippet uppercase tracking-widest transition-all border cursor-pointer';
    let acts = '';
    if (v.scheduled && !v.out_time)
      acts += `<button class="${btnBase} border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20" onclick="allowEntry('${id}')">Allow In</button>`;
    else if (!v.out_time && v.approved)
      acts += `<button class="${btnBase} border-primary-container/30 bg-primary-container/10 text-primary-container hover:bg-primary-container/20" onclick="releaseVisitor('${id}')">Release</button>`;
    else if (!v.out_time)
      acts += `<button class="${btnBase} border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary-container/40" onclick="checkoutVisitor('${id}')">Check Out</button>`;
    else if (!v.security_confirmed)
      acts += `<button class="${btnBase} border-tertiary-fixed-dim/30 text-tertiary-fixed-dim hover:bg-tertiary-fixed-dim/10" onclick="securityCheckout('${id}')">Confirm Exit</button>`;

    if (v.is_flagged)
      acts += `<button class="${btnBase} border-outline-variant/20 text-on-surface-variant hover:text-secondary" onclick="unflagVisitor('${id}')" title="Remove flag"><span class="material-symbols-outlined text-[11px]">flag_circle</span></button>`;
    else
      acts += `<button class="${btnBase} border-outline-variant/20 text-on-surface-variant hover:text-error" onclick="openFlagModal('${id}')" title="Flag visitor"><span class="material-symbols-outlined text-[11px]">flag</span></button>`;

    acts += `<a href="/badge.html?id=${id}" target="_blank" class="${btnBase} border-outline-variant/20 text-on-surface-variant hover:text-primary-container" title="View badge"><span class="material-symbols-outlined text-[11px]">badge</span></a>`;
    acts += `<button class="${btnBase} border-outline-variant/20 text-on-surface-variant hover:text-error hover:border-error/30" onclick="deleteVisitor('${id}', this)" title="Delete"><span class="material-symbols-outlined text-[11px]">delete</span></button>`;

    return `<tr>
      <td><input type="checkbox" class="row-check" data-id="${id}" ${isChecked?'checked':''} onchange="onRowCheck(this)" style="accent-color:#4edea3;cursor:pointer;"></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${avatar}
          <div>
            <div style="font-size:.82rem;font-weight:500;color:#dce4e5;">${v.full_name}${v.is_flagged ? ' <span style="color:#ffb4ab;font-size:.7rem;">●</span>' : ''}</div>
            <div style="font-size:.68rem;color:#849495;font-family:Geist,monospace;">${v.badge_number || ''} ${dateStr ? '· '+dateStr : ''}</div>
            ${repeatFlag}
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:.82rem;font-family:Geist,monospace;color:#dce4e5;">${v.contact_number}</div>
        ${v.email ? `<div style="font-size:.7rem;color:#849495;">${v.email}</div>` : ''}
      </td>
      <td>
        <div style="font-size:.82rem;color:#dce4e5;">${v.department_visiting}</div>
        <div style="font-size:.7rem;color:#849495;">→ ${v.person_to_visit}</div>
      </td>
      <td>
        <span class="s-chip">${v.purpose_of_visit || 'General'}</span>
        ${v.visitor_type ? `<div style="font-size:.68rem;color:#849495;margin-top:3px;">${v.visitor_type}</div>` : ''}
      </td>
      <td>
        <div style="font-family:Geist,monospace;font-size:.72rem;">
          <div style="color:#4edea3;">▲ ${inT}</div>
          <div style="color:#849495;">▼ ${outT}</div>
        </div>
      </td>
      <td>${badge}</td>
      <td><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${acts}</div></td>
    </tr>`;
  }).join('');
}

function onRowCheck(cb) {
  const id = cb.dataset.id;
  if (cb.checked) selectedIds.add(id);
  else { selectedIds.delete(id); document.getElementById('select-all').checked = false; }
  updateBulkBar();
}

// ─── Actions ───
function checkoutVisitor(id) {
  if (!confirm('Mark this visitor as checked out?')) return;
  authFetch(`/api/visitors/${id}/checkout`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Checked out'); })
    .catch(() => toast('Checkout failed', 'error'));
}

function releaseVisitor(id) {
  authFetch(`/api/visitors/${id}/release`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Visitor released'); })
    .catch(() => toast('Release failed', 'error'));
}

function securityCheckout(id) {
  authFetch(`/api/visitors/${id}/security-checkout`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Security exit confirmed'); })
    .catch(() => toast('Failed', 'error'));
}

function allowEntry(id) {
  authFetch(`/api/visitors/${id}/allow-entry`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Entry allowed'); })
    .catch(() => toast('Failed', 'error'));
}

function deleteVisitor(id, btn) {
  if (!confirm('Permanently delete this visitor record?')) return;
  const row = btn.closest('tr');
  row.style.opacity = '0.4';
  authFetch(`/api/visitors/${id}`, {method:'DELETE'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Record deleted'); })
    .catch(() => { toast('Delete failed', 'error'); row.style.opacity = '1'; });
}

function bulkDeleteSelected() {
  if (!selectedIds.size) return;
  if (!confirm(`Delete ${selectedIds.size} selected records permanently?`)) return;
  authFetch('/api/visitors/bulk', {
    method: 'DELETE',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ids: [...selectedIds] })
  }).then(r => {
    if (!r.ok) throw new Error();
    toast(`${selectedIds.size} records deleted`);
    selectedIds.clear();
    loadVisitors(); loadStats();
    document.getElementById('bulk-bar').classList.remove('show');
  }).catch(() => toast('Bulk delete failed', 'error'));
}

// ─── Flag modal ───
function openFlagModal(id) {
  flagTargetId = id;
  document.getElementById('flag-reason').value = '';
  document.getElementById('flag-modal').style.display = 'flex';
}
function closeFlagModal() {
  document.getElementById('flag-modal').style.display = 'none';
  flagTargetId = null;
}
function submitFlag() {
  if (!flagTargetId) return;
  const reason = document.getElementById('flag-reason').value.trim() || 'Flagged by admin';
  authFetch(`/api/visitors/${flagTargetId}/flag`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ reason })
  }).then(r => {
    if(!r.ok) throw new Error();
    closeFlagModal();
    loadVisitors(); loadStats();
    toast('Visitor flagged');
  }).catch(() => toast('Flag failed', 'error'));
}
function unflagVisitor(id) {
  authFetch(`/api/visitors/${id}/unflag`, {method:'POST'})
    .then(r => { if(!r.ok) throw new Error(); loadVisitors(); loadStats(); toast('Flag removed'); })
    .catch(() => toast('Failed', 'error'));
}

// ─── Export ───
function downloadExcel(period) {
  exportDrop.classList.remove('open');
  const params = new URLSearchParams({ period, token });
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo)   params.set('to', dateTo + 'T23:59:59');
  fetch(`/api/visitors/export?${params}`)
    .then(r => r.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SECURE_Visitors_${period}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      toast('Export downloaded');
    }).catch(() => toast('Export failed', 'error'));
}

// ─── Close modal on backdrop click ───
document.getElementById('flag-modal').addEventListener('click', function(e) {
  if (e.target === this) closeFlagModal();
});

// ─── Init ───
loadStats();
loadVisitors();
loadActivity();
