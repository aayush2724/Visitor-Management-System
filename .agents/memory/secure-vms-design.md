---
name: SECURE VMS Design System
description: Design tokens and CSS architecture for the SECURE VMS premium dark UI
---

## Design system
- **File**: `frontend/css/shared.css` — single source of truth for all tokens, components, utilities
- **All page CSS files** import shared.css via `@import url('shared.css')` at the top
- **Colors**: `--accent: #6366f1` (indigo), `--green: #10b981` (emerald), `--bg: #080c14`, `--bg-card: #0f1420`
- **Fonts**: Inter (body), Plus Jakarta Sans (display/headings), JetBrains Mono (code/badges)

## Component classes (from shared.css)
- `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-danger`, `.btn-success`, `.btn-sm`, `.btn-lg`, `.btn-full`
- `.card`, `.card-header`, `.card-title`
- `.form-control`, `.form-group`, `.form-label`
- `.stat-card`, `.stat-value`, `.stat-label`
- `.badge`, `.badge-active`, `.badge-released`, `.badge-pending`, `.badge-flagged`, `.badge-scheduled`
- `.topbar`, `.brand`, `.nav-links`, `.nav-link`, `.nav-badge`, `.icon-btn`
- `.page-wrap`, `.page-header`, `.page-title`, `.page-subtitle`
- `.table-wrap`, `.table-scroll`, `.empty-state`
- `.modal-overlay`, `.modal`
- `.toast`, `.toast-container`
- `.avatar`, `.avatar-initials`
- `.chip`

**Why:** All pages reuse shared components for consistency. Never duplicate button/card/badge styles in page-specific CSS.
