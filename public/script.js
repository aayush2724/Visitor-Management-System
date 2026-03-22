class VisitorSystem {
  constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.captureBtn = document.getElementById('capture-btn');
    this.visitorForm = document.getElementById('visitor-form');
    this.passSection = document.getElementById('pass-section');
    this.badgeDisplay = document.getElementById('badge-display');
    this.stream = null;
    this.capturedPhoto = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  async setupCamera() {
    try {
      if (this.stream) return true;

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      this.video.srcObject = this.stream;
      this.captureBtn.innerHTML = '<i data-lucide="camera"></i> Capture Photo';
      lucide.createIcons();
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      alert('Could not access the camera. Please ensure permissions are granted.');
      return false;
    }
  }

  // FIX: Stop camera stream to turn off webcam LED after registration
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.video.srcObject = null;
    }
  }

  setupEventListeners() {
    this.captureBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!this.stream) {
        await this.setupCamera();
      } else {
        this.capturePhoto();
      }
    });

    this.visitorForm.addEventListener('submit', this.handleFormSubmit.bind(this));
  }

  capturePhoto() {
    if (this.video.readyState !== 4) {
      alert('Video not ready yet. Please wait a moment.');
      return;
    }

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    this.capturedPhoto = this.canvas.toDataURL('image/jpeg', 0.85);

    this.video.style.opacity = '0.5';
    this.video.style.transition = 'opacity 0.3s ease';
    this.captureBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Retake Photo';
    lucide.createIcons();
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.capturedPhoto) {
      alert('Please capture a photo before registering.');
      return;
    }

    const submitBtn = this.visitorForm.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processing...';
    lucide.createIcons();

    const formData = new FormData();
    formData.append('full_name', document.getElementById('full_name').value);
    formData.append('contact_number', document.getElementById('contact_number').value);
    formData.append('department_visiting', document.getElementById('department_visiting').value);
    formData.append('person_to_visit', document.getElementById('person_to_visit').value);

    const blob = await (await fetch(this.capturedPhoto)).blob();
    formData.append('photo', blob, 'visitor.png');

    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        body: formData
      });

      // FIX: Extract real server error message instead of generic "Registration failed"
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Registration failed');
      }

      const result = await response.json();
      this.showSuccess(result);

      // Reset form state
      this.visitorForm.reset();
      this.capturedPhoto = null;
      this.video.style.opacity = '1';

      // FIX: Stop the camera stream so webcam LED turns off
      this.stopCamera();
      this.captureBtn.innerHTML = '<i data-lucide="camera"></i> Initialize Camera';
      lucide.createIcons();

    } catch (error) {
      console.error('Submit error:', error);
      alert('Error: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
      lucide.createIcons();
    }
  }

  showSuccess(visitor) {
    this.passSection.style.display = 'block';
    this.badgeDisplay.innerHTML = `
      <div class="visitor-badge" style="margin: 20px auto; display: block; text-align: left;">
        <h2 style="color: #000; margin-bottom: 20px;">Visitor Pass</h2>
        <div style="display: flex; gap: 20px; align-items: flex-start;">
          ${this.capturedPhoto
            ? `<img src="${this.capturedPhoto}" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover; flex-shrink: 0;">`
            : ''}
          <div class="badge-info" style="flex: 1;">
            <p><strong>Name:</strong> <span>${visitor.full_name || '—'}</span></p>
            <p><strong>Host:</strong> <span>${visitor.person_to_visit || '—'}</span></p>
            <p><strong>Dept:</strong> <span>${visitor.department_visiting || '—'}</span></p>
            <p><strong>Date:</strong> <span>${new Date().toLocaleDateString()}</span></p>
          </div>
        </div>
        ${visitor.qr_code_path
          ? `<img src="${visitor.qr_code_path}" style="width: 100px; margin-top: 15px; display: block;" alt="QR Code">`
          : ''}
      </div>
    `;
    this.passSection.scrollIntoView({ behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VisitorSystem();
});