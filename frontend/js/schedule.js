// Set min date to today
const dateInput = document.getElementById('scheduled_date');
dateInput.min = new Date().toISOString().split('T')[0];

// Toast
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

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn       = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  btn.disabled    = true;
  submitText.textContent = 'Scheduling…';

  const dateVal = document.getElementById('scheduled_date').value;
  const timeVal = document.getElementById('scheduled_time').value;
  const scheduled_date = timeVal ? `${dateVal}T${timeVal}` : `${dateVal}T09:00`;

  const data = {
    full_name:             document.getElementById('full_name').value.trim(),
    contact_number:        document.getElementById('contact_number').value.trim(),
    email:                 document.getElementById('email').value.trim(),
    visitor_type:          document.getElementById('visitor_type').value,
    department_visiting:   document.getElementById('department_visiting').value,
    person_to_visit:       document.getElementById('person_to_visit').value.trim(),
    purpose_of_visit:      document.getElementById('purpose_of_visit').value,
    expected_duration:     document.getElementById('expected_duration').value,
    notes:                 document.getElementById('notes').value.trim(),
    scheduled_date,
  };

  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Scheduling failed');

    // Show success
    document.getElementById('success-badge').textContent = result.badge_number || 'N/A';

    const deptName = document.getElementById('department_visiting').options[document.getElementById('department_visiting').selectedIndex]?.text || data.department_visiting;
    const scheduledDateStr = new Date(scheduled_date).toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const scheduledTimeStr = timeVal ? new Date(scheduled_date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';

    document.getElementById('success-details').innerHTML = `
      <strong>${data.full_name}</strong><br>
      ${deptName} → ${data.person_to_visit}<br>
      📅 ${scheduledDateStr}${scheduledTimeStr ? ' at ' + scheduledTimeStr : ''}<br>
      🎯 ${data.purpose_of_visit} · ${data.expected_duration}
    `;

    const qrEl = document.getElementById('success-qr');
    if (result.qr_code_path) {
      qrEl.src = result.qr_code_path;
      qrEl.style.display = 'block';
    }

    document.getElementById('success-overlay').style.display = 'flex';
    e.target.reset();
    dateInput.min = new Date().toISOString().split('T')[0];
    toast('Visit scheduled successfully!');
  } catch (err) {
    toast(err.message || 'Scheduling failed', 'error');
  } finally {
    btn.disabled = false;
    submitText.textContent = 'Confirm Schedule';
  }
});

document.getElementById('success-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});
