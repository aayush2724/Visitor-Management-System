// ─── Toast system ───
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

// ─── Repeat visitor check ───
let repeatCheckTimeout = null;
document.getElementById('contact_number').addEventListener('input', function() {
  clearTimeout(repeatCheckTimeout);
  const val = this.value.trim();
  if (val.length < 8) {
    document.getElementById('repeat-banner').style.display = 'none';
    return;
  }
  repeatCheckTimeout = setTimeout(async () => {
    try {
      const r = await fetch(`/api/visitors/check-repeat?phone=${encodeURIComponent(val)}`);
      const d = await r.json();
      const banner = document.getElementById('repeat-banner');
      if (d.is_repeat) {
        document.getElementById('repeat-text').textContent =
          `Repeat visitor — ${d.visit_count} previous visit${d.visit_count > 1 ? 's' : ''}. Last visit: ${d.last_visit ? new Date(d.last_visit).toLocaleDateString() : 'unknown'}`;
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    } catch (e) { /* silent */ }
  }, 600);
});

// ─── Camera logic ───
const camWrap   = document.getElementById('cam-wrap');
const camOffline = document.getElementById('cam-offline');
const video     = document.getElementById('video');
const canvas    = document.getElementById('canvas');
const snapshot  = document.getElementById('snapshot');
const camBtn    = document.getElementById('cam-btn');
const retakeBtn = document.getElementById('retake-btn');
const camStatus = document.getElementById('cam-status');

let stream = null;
let capturedPhoto = null;
let cameraActive = false;

function setCamStatus(text, locked = false) {
  camStatus.textContent = text;
  camStatus.className = `cam-status show${locked ? ' locked' : ''}`;
}
function clearCamStatus() { camStatus.className = 'cam-status'; }

camBtn.addEventListener('click', async () => {
  if (!cameraActive) {
    await startCamera();
  } else {
    capturePhoto();
  }
});

retakeBtn.addEventListener('click', () => {
  capturedPhoto = null;
  snapshot.style.display = 'none';
  snapshot.src = '';
  video.style.display = 'block';
  camWrap.classList.remove('captured');
  retakeBtn.style.display = 'none';
  camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="4"/><path d="M1.05 12H3m18 0h1.95M12 1.05V3m0 18v1.95M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> Take Photo`;
  clearCamStatus();
});

async function startCamera() {
  camBtn.disabled = true;
  camBtn.innerHTML = `<span>Starting camera…</span>`;

  const constraints = [
    { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: 'user' } },
    { video: true }
  ];

  for (const c of constraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      break;
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        toast('Camera permission denied. Allow camera access in your browser.', 'error');
        camBtn.disabled = false;
        camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Start Camera`;
        return;
      }
    }
  }

  if (!stream) {
    toast('Could not access camera. Proceeding without photo.', 'warning');
    camBtn.disabled = false;
    camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Start Camera`;
    return;
  }

  camOffline.style.display = 'none';
  video.srcObject = stream;
  video.style.display = 'block';
  camWrap.classList.add('active');
  cameraActive = true;
  camBtn.disabled = false;
  camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="4"/><path d="M1.05 12H3m18 0h1.95M12 1.05V3m0 18v1.95M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> Take Photo`;
  setCamStatus('Camera live');
}

function capturePhoto() {
  if (!stream || video.readyState < 2) { toast('Camera not ready', 'error'); return; }
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  capturedPhoto = canvas.toDataURL('image/jpeg', 0.88);
  snapshot.src = capturedPhoto;
  snapshot.style.display = 'block';
  video.style.display = 'none';
  camWrap.classList.add('active');
  retakeBtn.style.display = 'flex';
  camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="4"/><path d="M1.05 12H3m18 0h1.95M12 1.05V3m0 18v1.95M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> Retake`;
  setCamStatus('Photo captured ✓', true);
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  cameraActive = false;
}

// ─── Form submit ───
document.getElementById('visitor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  btn.disabled = true;
  submitText.textContent = 'Registering…';

  const formData = new FormData();
  formData.append('full_name',            document.getElementById('full_name').value.trim());
  formData.append('contact_number',       document.getElementById('contact_number').value.trim());
  formData.append('department_visiting',  document.getElementById('department_visiting').value);
  formData.append('person_to_visit',      document.getElementById('person_to_visit').value.trim());
  formData.append('purpose_of_visit',     document.getElementById('purpose_of_visit').value);
  formData.append('visitor_type',         document.getElementById('visitor_type').value);
  formData.append('email',                document.getElementById('email').value.trim());
  formData.append('host_email',           document.getElementById('host_email').value.trim());
  formData.append('host_phone',           document.getElementById('host_phone').value.trim());
  formData.append('expected_duration',    document.getElementById('expected_duration').value);
  formData.append('nda_signed',           document.getElementById('nda_signed').checked);

  if (capturedPhoto) {
    const blob = await (await fetch(capturedPhoto)).blob();
    formData.append('photo', blob, 'visitor.jpg');
  }

  try {
    const r = await fetch('/api/visitors', { method: 'POST', body: formData });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Registration failed');
    showSuccess(data);
    e.target.reset();
    capturedPhoto = null;
    stopCamera();
    video.style.display = 'none';
    snapshot.style.display = 'none';
    snapshot.src = '';
    camOffline.style.display = 'flex';
    camWrap.classList.remove('active');
    retakeBtn.style.display = 'none';
    camBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Start Camera`;
    cameraActive = false;
    clearCamStatus();
    document.getElementById('repeat-banner').style.display = 'none';
  } catch (err) {
    toast(err.message || 'Registration failed', 'error');
  } finally {
    btn.disabled = false;
    submitText.textContent = 'Authorize Entry';
  }
});

function showSuccess(data) {
  document.getElementById('pass-badge').textContent = data.badge_number || 'N/A';
  document.getElementById('pass-name').textContent  = `${data.full_name} → ${data.department_visiting || ''}`;

  const qrEl = document.getElementById('pass-qr');
  if (data.qr_code_path) {
    qrEl.src = data.qr_code_path;
    qrEl.style.display = 'block';
  }

  const repeatNote = document.getElementById('pass-repeat');
  if (data.is_repeat) {
    repeatNote.textContent = `⚠ Repeat visitor — ${data.visit_count} total visits`;
    repeatNote.style.display = 'block';
  } else {
    repeatNote.style.display = 'none';
  }

  const overlay = document.getElementById('pass-overlay');
  overlay.style.display = 'flex';
}

document.getElementById('close-pass-btn').addEventListener('click', () => {
  document.getElementById('pass-overlay').style.display = 'none';
  document.getElementById('pass-qr').style.display = 'none';
  document.getElementById('pass-qr').src = '';
});
