# SECURE Visitor Management System

## Overview
A full-featured, enterprise-grade Visitor Management System built with Node.js/Express + MongoDB. Modern premium dark UI (indigo/emerald palette, Inter font).

## Architecture
- **Backend**: Node.js + Express (server.js → backend/app.js)
- **Database**: MongoDB via Mongoose (requires Atlas URI in Secrets)
- **Frontend**: Vanilla HTML/CSS/JS served statically from `/frontend`
- **Port**: 5000 (0.0.0.0)
- **Entry**: `node server.js`

## Pages
| Page | Path | Auth |
|------|------|------|
| Visitor Check-In | `/` | Public |
| Schedule a Visit | `/schedule.html` | Public |
| Dashboard | `/dashboard.html` | Admin token |
| Analytics | `/analytics.html` | Admin token |
| Login | `/login.html` | Public |
| Visitor Badge | `/badge.html?id=<id>` | Public |

## Required Environment Variables (Secrets)
Set these in the **Secrets** tab:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | **Yes** |
| `ADMIN_SECRET_TOKEN` | Admin password / auth token | **Yes** |
| `TWILIO_ACCOUNT_SID` | Twilio SID for SMS/WhatsApp | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional |
| `TWILIO_PHONE_NUMBER` | SMS sender number | Optional |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender (e.g. whatsapp:+14155238886) | Optional |
| `RESEND_API_KEY` | Resend API key for email | Optional |
| `HR_EMAIL` | HR email for flag alerts | Optional |
| `HR_PHONE` | HR phone for flag alerts | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary for photo storage | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Optional |
| `BASE_URL` | Public URL (e.g. https://yourapp.replit.app) | Optional |

> Without `MONGODB_URI` the app starts but all API calls fail. Set it first.
> Without `ADMIN_SECRET_TOKEN` the dashboard/analytics login won't work.

## Key Features
- Walk-in visitor registration with camera capture
- Repeat visitor detection (by phone number)
- QR code generation on check-in
- WhatsApp + SMS + Email notifications via Twilio & Resend
- Admin dashboard with real-time SSE updates
- Bulk operations, flag/unflag visitors
- Excel export (daily/weekly/monthly/all)
- Analytics with Chart.js (trends, dept breakdown, peak hours, etc.)
- Visit scheduling with confirmation notifications
- Printable visitor badges
- NDA acknowledgment
- Security exit confirmation flow

## User Preferences
- Premium dark UI — indigo (#6366f1) + emerald (#10b981) palette
- Inter + Plus Jakarta Sans + JetBrains Mono fonts
- No emojis in code (only in UI labels where appropriate)
