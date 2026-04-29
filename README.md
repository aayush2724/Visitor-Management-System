<div align="center">
  
# 🛡️ SECURE Visitor Management System
**Next-Generation Cyberpunk-Themed Enterprise Visitor & Security Tracking**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](https://twilio.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Deployed on Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://secure-visitor-management.onrender.com/)

<br/>

</div>

---

## 🌌 Overview

SECURE is a fully modernized, cyberpunk-styled full-stack application designed to replace legacy paper-based visitor logs in corporate environments. 

It handles end-to-end visitor processing: from initial registration and hardware-locked photo capture, to automated WhatsApp/Email background notifications, secure administrative dashboards, and pre-scheduled visitor entry logic. 

---

## 🏗️ System Architecture (SaaS Structure)

The project follows a modular SaaS architecture for scalability:

```text
RSB-Visitor-Management-System/
├── backend/
│   ├── config/              # DB & Env configurations
│   ├── controllers/         # Request logic (what happens)
│   ├── middlewares/         # Auth, security & error handling
│   ├── models/              # Database schemas (Mongoose)
│   ├── routes/              # API endpoints (URLs)
│   ├── services/            # Business logic (optional but pro)
│   ├── utils/               # Helper functions & scripts
│   └── app.js               # Express application setup
├── frontend/                # View Layer (Static HTML/CSS/JS)
├── server.js                # Application Entry Point
├── package.json             # Root dependencies & scripts
└── .env                     # Environment Secrets
```

---

## 🛡️ Enhanced Security Suite

- **Authenticated API Access**: Protected by a server-side **Auth Middleware** requiring a secret token.
- **Brute-Force Protection**: Implements `express-rate-limit` on the login gateway.
- **Production-Grade Headers**: Powered by `Helmet.js`.
- **Encrypted Env Handling**: Managed exclusively through environment variables.

---

## ✨ Core Features

- **Biometric Identity Capture**: Custom JS webcam integration with Cloudinary upload.
- **Dynamic Check-in Pass & QR Code**: Automated QR generation for secure entry.
- **Background Async Notifications**: Email via `Nodemailer/Resend` and WhatsApp via `Twilio`.
- **Intelligence Dashboard**: Live stats, search, filtering, and `.xlsx` exporting.
- **Pre-Clearance Schedule Portal**: Pre-approve future guest visits.

---

## 🚀 Deployment Instructions (Render + MongoDB Atlas)

### 1. Database Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Copy your connection string (`mongodb+srv://...`).

### 2. Render Setup
1. Sign in to [Render](https://render.com) and create a **New Web Service**.
2. Connect this repository.
3. Use the following commands:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add the **Environment Variables** listed below.

### Required Environment Variables
```env
# Core
PORT=3000
MONGODB_URI=your_mongodb_atlas_uri
BASE_URL=https://your-app.onrender.com
ADMIN_PASSWORD=your_secure_pin
ADMIN_SECRET_TOKEN=generate_a_random_long_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Messaging
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=your_twilio_number
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
HR_EMAIL=recipient@gmail.com
```

---

## 🐳 Docker Deployment

1. **Ensure Docker is Installed**
2. **Build and Run**
   ```bash
   docker-compose up -d --build
   ```
3. **Access**: `http://localhost:3000`

---

## 💻 Local Development Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/aayush2724/RSB-Visitor-Management-System.git
   cd RSB-Visitor-Management-System
   npm install
   ```
2. **Configure .env** in the root folder.
3. **Run**
   ```bash
   npm run dev
   ```

---

<div align="center">
  <i>Engineered with 💻 and lots of neon glow</i>
</div>
