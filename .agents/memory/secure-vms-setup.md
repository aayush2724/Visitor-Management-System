---
name: SECURE VMS Setup
description: Critical boot order and required secrets for the SECURE Visitor Management System
---

## Boot order
`server.js` calls `app.listen()` first, then `connectDB()` inside the callback. This ensures the HTTP server (port 5000) is always reachable even when MongoDB is unavailable.

**Why:** The Replit workflow healthcheck requires port 5000 to open. If `connectDB()` is awaited before `listen()`, a MongoDB timeout (8 s) crashes the process before the port opens, failing the workflow.

**How to apply:** Any future refactor of server.js must keep this order: listen → connectDB inside callback.

## Required secrets
- `MONGODB_URI` — without this, `db.js` logs a warning and returns without connecting; all API routes that touch Mongoose will fail with 500.
- `ADMIN_SECRET_TOKEN` — compared directly in `authMiddleware.js`; dashboard/analytics/export all require `Bearer <token>` header.

## Auth flow
- Token stored in `sessionStorage` as `secure_auth`
- Dashboard + Analytics redirect to `/login.html` if token absent
- Login POSTs to `/api/admin/login` which returns `{ token }` = the ADMIN_SECRET_TOKEN value
