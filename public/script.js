class VisitorSystem {
  constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.captureBtn = document.getElementById('capture-btn');
    this.visitorForm = document.getElementById('visitor-form');
    this.passSection = document.getElementById('pass-section');
    this.camPlaceholder = document.getElementById('cam-placeholder');
    this.photoStatus = document.getElementById('photo-status');
    this.stream = null;
    this.capturedPhoto = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  async setupCamera() {
    const errorMessages = {
      NotAllowedError: 'Camera access denied. Please click the lock icon in your address bar and "Allow" the camera.',
      NotFoundError: 'No camera found on this device.',
      NotReadableError: 'Camera is already in use by another application.',
      OverconstrainedError: 'Requested camera resolution not supported.'
    };

    const tryConstraints = async (constraints) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        return true;
      } catch (e) {
        return e;
      }
    };

    try {
      if (this.stream) return true;

      // Try fallbacks
      const constraints = [
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user' } },
        { video: true }
      ];

      let lastError;
      for (const c of constraints) {
        const result = await tryConstraints(c);
        if (result === true) {
          // Success code remains same
          if (this.camPlaceholder) this.camPlaceholder.style.display = 'none';
          if (this.photoStatus) this.photoStatus.innerText = '';
          this.video.style.display = 'block';
          this.video.srcObject = this.stream;
          this.captureBtn.innerText = 'Take Identity Snapshot';
          return true;
        }
        lastError = result;
      }

      console.error('Final Camera error:', lastError);
      const msg = errorMessages[lastError.name] || `Could not access the camera (${lastError.name}). Ensure permissions are granted.`;
      alert(msg);
      return false;
    } catch (error) {
      console.error('Unexpected Camera error:', error);
      alert('Camera initialization failed. Please ensure you are on a secure connection (HTTPS).');
      return false;
    }
  }

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
    this.captureBtn.innerText = 'Retake Validation Snapshot';
    if (this.photoStatus) this.photoStatus.innerText = 'BIOMETRIC LOCK AFFIRMED';
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.capturedPhoto) {
      alert('Please capture a photo before authorizing entry.');
      return;
    }

    const submitBtn = this.visitorForm.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'PROCESSING KEY...';

    const formData = new FormData();
    formData.append('full_name', document.getElementById('full_name').value);
    formData.append('contact_number', document.getElementById('contact_number').value);
    formData.append('department_visiting', document.getElementById('department_visiting').value);
    formData.append('person_to_visit', document.getElementById('person_to_visit').value);

    // Hidden field needed for DB schema backwards compat
    const purposeEl = document.getElementById('purpose_of_visit');
    formData.append('purpose_of_visit', purposeEl ? purposeEl.value : 'Facility Access');

    const blob = await (await fetch(this.capturedPhoto)).blob();
    formData.append('photo', blob, 'visitor.png');

    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Registration failed');
      }

      const result = await response.json();
      this.showSuccess(result);

      // Reset
      this.visitorForm.reset();
      this.capturedPhoto = null;
      this.video.style.opacity = '1';
      this.stopCamera();
      this.captureBtn.innerText = 'Initiate Capture Protocol';
      if (this.photoStatus) this.photoStatus.innerText = '';
      this.video.style.display = 'none';
      if (this.camPlaceholder) this.camPlaceholder.style.display = 'flex';

    } catch (error) {
      console.error('Submit error:', error);
      alert('Error: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }

  showSuccess(data) {
    this.passSection.style.display = 'flex';
    const qrUrl = data.qr_code_path || (data.visitor && data.visitor.qr_code_path);
    if (qrUrl) {
      const qrEl = document.getElementById('pass-qr');
      if (qrEl) {
        qrEl.src = qrUrl;
        qrEl.style.display = 'block';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VisitorSystem();
});