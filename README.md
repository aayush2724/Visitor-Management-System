<div align="center">
  
# 🛡️ RSB | SECURE Visitor Management System
**Next-Generation Cyberpunk-Themed Enterprise Visitor & Security Tracking**

[![React](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](https://twilio.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Deployed on Railway](https://img.shields.io/badge/Railway-131415?style=for-the-badge&logo=railway&logoColor=white)](https://rsb-visitor-management-system-production.up.railway.app/)

<br/>



</div>

---

## 🌌 Overview

RSB Secure is a fully modernized, cyberpunk-styled full-stack application designed to replace legacy paper-based visitor logs in corporate environments. 

It handles end-to-end visitor processing: from initial registration and hardware-locked photo capture, to automated WhatsApp/Email background notifications, secure administrative dashboards, and pre-scheduled visitor entry logic. To ensure absolute data security, an **Encrypted JWT-style Authentication Protocol** protects the backend admin portal from unauthorized access.

---

## 🎨 UI / UX Design Philosophy

The entire frontend ecosystem was meticulously crafted entirely from scratch using vanilla CSS and raw SVGs to ensure absolute control over the visuals without any framework bloat.
* **Deep-Navy/Cyan Aesthetic**: Driven by specific hex codes (`--bg: #07090e`, `--accent: #00e5ff`) to mimic high-tech military cyber-terminals.
* **Micro-Animations**: Custom keyframes for glowing border-pulses, typing text effects, modal staggered slide-ins, and dynamic grid-movement backgrounds.
* **Custom Iconography**: Utilizing sleek stroke-based SVG icons to seamlessly blend with the structural panels and dynamic elements.

---

## ✨ Core Features & Microservices

- **Biometric Identity Capture**: Custom JavaScript hooks into the device's webcam (`navigator.mediaDevices.getUserMedia`) to snap live photos upon visitor registration, instantly buffering to Cloudinary.
- **Dynamic Check-in Pass & QR Code**: Instantly generates an entry QR Code unique to each visitor's internal MongoDB UUID, storing the QR in Cloudinary for rapid subsequent fetching.
- **Background Async Notifications**: Employs non-blocking routines to fire off beautifully formatted HTML Emails via `Nodemailer` and direct WhatsApp tickets via `Twilio` the second a visitor checks in.
- **Intelligence Dashboard (Admin Center)**: 
  - Live, real-time KPI statistics (Total Visitors, Active In-Facility, Released, Security Pending, Pre-Scheduled).
  - Search & filtering, immediate entry/exit logging toggles, and permanent record-deletion capabilities.
  - One-click `.xlsx` exporting wrapper built natively over the dashboard dataset.
- **Pre-Clearance Schedule Portal**: Allows hosts to pre-approve future dates and times for incoming guests, skipping the intensive on-site biometric lock process.

---

## 🏗️ System Architecture & Data Flow

```mermaid
graph TD;
    V[Visitor] -->|Fills Particulars & Bio-Photo| F(Frontend App)
    F -->|POST /api/visitors| E{Express Edge Server}
    E -->|1. Uploads Image buffer| C[(Cloudinary Storage)]
    E -->|2. Saves Initial Record| M[(Railway MongoDB Instance)]
    E -->|3. Generates QR / ID| C
    E -->|4. Fires Background Event Loop| Alert[Notification Engine]
    Alert -->|HTML Actionable Email| N[Nodemailer SMTP]
    Alert -->|WhatsApp Entry Ticket| T[Twilio API]
    
    H[Security Console] -->|Secure Password| L(Login Gateway)
    L -->|POST /api/admin/login| E
    E -->|Validates ENV credentials| Token[Session Token]
    Token -->|Access Granted| D(Admin Dashboard)
    D -->|GET/PUT/DELETE /api/visitors| E
```

---

## 🗄️ Database Schema Representation

The application relies securely on **Mongoose** strict schemas interacting with MongoDB.

```javascript
/* Primary Visitor Schema Blueprint */
{
  full_name: { type: String, required: true },
  contact_number: { type: String, required: true },
  department_visiting: { type: String, required: true },
  person_to_visit: { type: String, required: true },
  purpose_of_visit: { type: String, default: "General" },
  photo_path: { type: String }, /* Cloudinary URI */
  qr_code_path: { type: String }, /* Cloudinary URI */
  
  /* Timeline Tracking */
  in_time: { type: Date, default: Date.now },
  out_time: { type: Date }, /* Updated on Checkout */
  scheduled_date: { type: Date }, /* Future-dated entries */
  scheduled_time: { type: String },
  
  /* Security Flags */
  email_sent: { type: Boolean, default: false },
  security_confirmed: { type: Boolean, default: false }
}
```

---

## 🔌 API Endpoints Breakdown

| Method | Endpoint | Description | Guarded? |
| --- | --- | --- | --- |
| `POST` | `/api/visitors` | Registers a new visitor, processes photo buffer, drops to DB, triggers Async Notifiers. | No (Public) |
| `POST` | `/api/admin/login` | Compares raw password packet against `.env` hash. Returns secure session Token. | No |
| `GET`  | `/api/visitors/stats` | MongoDB aggregation pipeline to compute live KPIs (In, Out, Pending). | Yes |
| `GET`  | `/api/visitors` | Fetches the full structured array of visitor objects, sorted by most recent. | Yes |
| `PUT`  | `/api/visitors/:id/action` | State modifier. Marks visitors as `checked_out`, `approved` by HR, or `cleared` by security. | Yes |
| `DELETE`| `/api/visitors/:id` | Irrevocably purges the visitor record from the DB registry. | Yes |
| `GET`  | `/test-email` | Developer diagnostics route to forcibly unit-test SMTP server configs. | No |

---

## 🚀 Live Deployment Instructions (Railway)

This repository is optimized for instantaneous one-click deployment via **Railway.app** (with an attached MongoDB plugin).

1. **Fork/Clone** this repository and push it to your GitHub account.
2. Sign in to [Railway](https://railway.app) and select **New Project** > **Deploy from GitHub repo**.
3. Select your cloned repository.
4. **Add a Database**: Click **New** > **Database** > **MongoDB**.
5. Copy the internal `MONGO_URL` generated by Railway's MongoDB module.
6. Open your Web App's **Variables** tab (Raw Editor) and paste your environment parameters (see below). Mapping `MONGODB_URI` to the `MONGO_URL` you just copied.
7. Trigger a new deployment!

### Required Environment Variables
```env
# Core Systems
PORT=3000
MONGODB_URI=mongodb://mongo:user@host:port
BASE_URL=https://your-custom-app.up.railway.app

# Security Auth
ADMIN_PASSWORD=your_secure_pin

# Media Delivery (Cloudinary API)
CLOUDINARY_CLOUD_NAME=dgusezzo2
CLOUDINARY_API_KEY=********
CLOUDINARY_API_SECRET=********

# Messaging (Twilio API Sandbox / Prod)
TWILIO_ACCOUNT_SID=ACcf1fc5...
TWILIO_AUTH_TOKEN=C42PE...
TWILIO_WHATSAPP_NUMBER=+14155238886

# Mail Transporter (Google SMTP / App Passwords)
EMAIL_SERVICE=gmail
EMAIL_PORT=587 
EMAIL_USER=your_auth_email@gmail.com
EMAIL_PASS=16_char_app_password
EMAIL_FROM=system_name@gmail.com
HR_EMAIL=recipient_email@gmail.com
```

---

## 🐳 Docker Deployment

To run the entire application stack (Node.js App + MongoDB) instantly using Docker:

1. **Ensure Docker is Installed**
   Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop) (or Docker Engine) and Docker Compose are installed and running on your system.
2. **Configure Environment**
   Ensure your `.env` file is present in the root directory.
3. **Build and Run the Containers**
   ```bash
   docker-compose up -d --build
   ```
4. **Access the Application**
   The application will be available at `http://localhost:3000`. MongoDB will safely run in its own container on port `27017` and retain data via a Docker volume.
5. **Shutting Down**
   To stop the services and remove containers, run:
   ```bash
   docker-compose down
   ```

---

## 💻 Local Development Setup

To run this application locally on your machine for testing or enhancement:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/RSB-Visitor-Management-System.git
   cd RSB-Visitor-Management-System
   ```
2. **Install dependencies**
   Ensure you have `Node.js` installed, then run:
   ```bash
   npm install
   ```
3. **Configure your Local Sandbox**
   Create a `.env` file in the root directory following the exact structure shown in the Environment Variables section above. Use `mongodb://localhost:27017/visitor-management` for local MongoDB testing, or drop in a custom network DB URI.
4. **Boot the Node Engine**
   ```bash
   npm start
   ```
   *The server will mount onto `http://localhost:3000` locally.*

---

<div align="center">
  <i>Engineered with 💻 and lots of neon glow</i>
</div>
