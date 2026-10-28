# DwellGB 🏔️ — Homes for rent in Gilgit-Baltistan

A full-stack **long-term** rental marketplace for Gilgit-Baltistan, Pakistan (monthly rent, minimum stay 1 month — no hotels, hostels or nightly stays). Owners list houses, portions, flats and rooms; tenants search on a map, chat with owners in real time, send rental requests and leave reviews — without walking every street to ask.

Final Year Project — BS Computer Science, Karakoram International University, Gilgit.

---

## ✨ Features

| For tenants | For owners |
|---|---|
| Search by district (all 14 GB districts), area, rent, rooms, furnishing, heating (gas / bukhari / electric), water supply, "families / bachelors / students" and 16 amenities | 4-step listing wizard with drag-and-drop photos, reordering and a cover photo |
| **Mapbox map search** with price markers, "search as I move the map" and a **Map / Satellite** switch on every map | **Mapbox location picker**: search a place, click, drag the pin or use GPS |
| Save favourite homes | Dashboard: views, saves, pending requests, rating |
| Send a rental request (move-in date, people, message) | Accept / decline with a note — other requests auto-decline, listing marked rented |
| **Real-time chat** with owners (typing indicator, read receipts, online status) | Chat with tenants who contacted you |
| Owner phone + exact address unlocked only after acceptance | Phone number and exact pin stay private until **you** accept |
| Rate owners after an accepted booking | Public profile with rating breakdown |

**Owner identity check:** when an owner signs up they add their CNIC number plus three photos — CNIC front, CNIC back and a selfie holding the CNIC — using the laptop/phone **camera** (with an on-screen guide) or by **uploading** files. The photos are stored privately in `backend/private/` (never publicly served) and only admins can open them. An owner's listings stay **hidden until an admin approves** the documents; if rejected, the owner sees the reason and uploads again.

**Admins (`/admin`):** dashboard with 30-day sign-up/listing charts and district breakdown · user search by name/phone/email/CNIC · approve owners' CNIC + selfie (blue badge) · ban/unban (locks the user out immediately, hides their listings) · remove/restore/delete listings with a reason sent to the owner · report queue (users can report listings or users) with one-click enforcement · broadcast announcements to all users, owners or tenants.

**Everyone:** live notifications (bell + toasts + browser-tab counter), English / اردو with full RTL layout, Google sign-in, phone-or-email login, mobile-first responsive UI.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router 7, **Tailwind CSS v4** (styling), **shadcn/ui** components (Radix UI), **Framer Motion** (page fades, staggered cards, scroll reveals, modals, menus), Mapbox GL JS v3, Socket.IO client, `@react-oauth/google`, Sonner toasts |
| Backend | Node.js 20+, Express 4, **MongoDB + Mongoose 8**, Socket.IO 4, **express-validator**, Sharp (image processing), google-auth-library |
| Security | Helmet, CORS allow-list, rate limiting, NoSQL-injection sanitising, bcrypt (12 rounds), JWT in an httpOnly cookie |
| Tests | `node:test` + Supertest + mongodb-memory-server |

```
dwellgb/
├── backend/
│   ├── server.js            # HTTP + Socket.IO bootstrap
│   ├── app.js               # Express app (security middleware, routes)
│   ├── db.js                # MongoDB connection
│   ├── config/              # env validation, GB constants (districts, amenities…)
│   ├── models/              # User, Listing, Booking, Review, Conversation, Message, Notification, Report
│   ├── controllers/         # business logic
│   ├── routes/              # URL → express-validator rules → controller
│   ├── middleware/          # auth, validation, uploads, rate limits, errors
│   ├── services/            # realtime (Socket.IO), notifications, storage (Sharp), serializers
│   ├── scripts/             # seed.js, create-admin.js, optimize-images.js
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/             # axios client (sends the login cookie)
│       ├── context/         # Auth, Language (EN/UR), Realtime (socket + counters)
│       ├── components/      # UI kit, map components, navbar, gallery, uploader…
│       ├── pages/           # Home, Listings, ListingDetail, CreateListing, Messages, dashboards…
│       └── i18n/            # English + Urdu strings
└── mobile/                  # Expo app (v1 — see "Mobile app" below)
```

---

## 🚀 Getting started

### 1. Prerequisites
- **Node.js 20+**
- **MongoDB Community Server** installed locally (https://www.mongodb.com/try/download/community — tick "Install MongoDB as a Service" and "Install Compass"). It runs at `mongodb://127.0.0.1:27017`; the `dwellgb` database is created automatically.
- A **Mapbox** public token (`pk.…`) — the map is the only part that needs the internet.
- *(Optional)* a Google OAuth Client ID for "Continue with Google" — the button hides itself if you leave it empty.

Everything else — database, image uploads (`backend/uploads`), chat and notifications — runs on your own computer.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Edit `backend/.env`:
- `MONGODB_URI` — leave the default `mongodb://127.0.0.1:27017/dwellgb`
- `JWT_SECRET` — a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `GOOGLE_CLIENT_ID` — optional (see below)

```bash
npm run seed                # optional: demo users, 12 GB listings, a chat and a review
npm run seed:reset          # wipe the database and seed again (dev only)
npm run dev                 # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
```
Edit `frontend/.env`:
- `VITE_MAPBOX_TOKEN=pk.…`
- `VITE_GOOGLE_CLIENT_ID=…` (same value as the backend's `GOOGLE_CLIENT_ID`)

```bash
npm run dev                 # http://localhost:5173
```

### Demo accounts (after `npm run seed`) — password `Demo1234`
| Role | Login |
|---|---|
| Admin | `admin@demo.pk` → open `/admin` (one owner, Nadia Karim, is waiting in **Identity checks**) |
| Owner | `0355 1234567` |
| Owner (Skardu) | `0346 7654321` |
| Tenant | `ayesha@demo.pk` |
| Tenant | `0312 5550000` |

### Creating a real admin
Admins can't sign up from the website. Create one from the backend folder:
```bash
npm run create-admin -- --email you@example.com --password "A-strong-Pass1" --name "Your Name"
# or promote an existing account:
npm run create-admin -- --promote 0355 1234567
```
Then log in normally — you'll land on `/admin`.

### Setting up Google sign-in
1. https://console.cloud.google.com → create a project → *APIs & Services → OAuth consent screen* (External, add your email as a test user).
2. *Credentials → Create credentials → OAuth client ID → Web application*.
3. **Authorized JavaScript origins**: `http://localhost:5173` (+ your production URL later). No redirect URI is needed.
4. Put the client ID in **both** `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).

New Google users are asked once whether they are an owner or a tenant (owners also enter their CNIC). Existing accounts with the same verified email are linked automatically.

### Setting up Mapbox
1. https://account.mapbox.com → *Access tokens* → create a **public** token (default scopes are enough).
2. Add URL restrictions: `http://localhost:5173`, your production domain.
3. Put it in `frontend/.env` as `VITE_MAPBOX_TOKEN`.

---

## 🔐 How authentication works

```
Register / Login / Google  →  backend creates a JWT (7 days)  →  sends it as an httpOnly cookie "token"
Every request              →  browser sends the cookie        →  requireAuth checks it and loads the user
Logout                     →  backend clears the cookie
```
- **httpOnly** — JavaScript can't read the cookie, so an XSS bug can't steal the login.
- **SameSite=lax** — the cookie isn't sent on POSTs from other websites (CSRF protection).
- The user is loaded from MongoDB on every request, so a **banned** account is locked out at once.
- Socket.IO (chat + notifications) uses the same cookie.
- On page load the frontend calls `GET /api/auth/me` to find out who is logged in.

---

## 🛡️ What was fixed from v1 (audit summary)

**Critical**
- **Data loss:** the old JSON-file store silently replaced the whole database with an empty one if `rent.json` was ever corrupted, and wrote the entire file synchronously on every request → replaced with MongoDB (indexes, atomic updates).
- **Hard-coded JWT secret fallback** (`dwellgb-dev-secret-change-in-production`) → env vars are now validated at start-up; weak secrets refuse to boot in production.
- **Tokens in `localStorage`** (readable by any script) → JWT in an httpOnly cookie.
- **Upload bypass:** file type was checked only by extension (`virus.exe` → `virus.jpg` passed) → every image is decoded and re-encoded with Sharp; EXIF (incl. **GPS location** of the owner's phone) is stripped.
- **Duplicate identities:** `03001234567` and `+923001234567`, or a CNIC with/without dashes, created separate accounts (this happened in the real `rent.json`) → phone & CNIC normalised + unique DB indexes.

**Security**
- No rate limiting (password brute-force) → per-route limiters.
- CORS open to every origin → allow-list.
- No input validation (e.g. rating `"abc"` saved as `NaN`, `3.7` stars, NaN coordinates) → express-validator rules on every route; controllers only copy known fields (no mass-assignment).
- NoSQL-injection possible via JSON bodies → sanitised + typed validation.
- Internal error messages returned to users → central error handler, generic 500s.
- Deleted/deactivated users kept access until token expiry; role taken from the token → user re-checked on every request.
- Open redirect after login (`?next=`) → only same-site paths allowed.
- Exact house location was public → public map shows an approximate area; exact pin/address only for the owner and accepted tenant.

**Logic bugs**
- Tenants could "cancel" an **accepted/rejected** booking → only pending requests can be cancelled.
- Owners could accept two tenants for the same home (race) → atomic `pending → accepted` transition.
- Deleting a listing wiped all bookings (destroying tenants' history & reviews) → pending requests are cancelled and tenants notified.
- Editing a listing could only add photos, never remove or reorder them → fixed.
- Search crashed on listings without a city; no pagination → fixed, paginated, text-indexed.
- Frontend never handled expired logins (UI stayed "logged in" while every request failed) → a 401 now logs the user out.

---

## 📡 API overview

All routes are prefixed with `/api`. Logged-in requests send the `token` cookie automatically.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` · `POST /auth/logout` · `GET/PUT /auth/me` · `POST /auth/me/avatar` · `PUT /auth/me/password` · `POST /auth/me/verification` |
| Listings | `GET /listings` (filters: `q, district, area, propertyType, minRent, maxRent, bedrooms, bathrooms, furnishing, tenantPreference, heating, amenities, bbox, sort, page, limit`) · `GET /listings/stats` · `GET /listings/:id` · `GET /listings/:id/similar` · `GET /listings/mine` · `GET /listings/mine/stats` · `POST /listings` · `PUT /listings/:id` · `PATCH /listings/:id/status` · `DELETE /listings/:id` |
| Bookings | `POST /bookings` · `GET /bookings/mine` · `GET /bookings/received` · `PATCH /bookings/:id/status` · `PATCH /bookings/:id/cancel` |
| Reviews | `GET /reviews/owner/:id` · `GET /reviews/reviewable` · `POST /reviews` · `POST /reviews/:id/reply` |
| Messaging | `GET /conversations` · `GET /conversations/unread-count` · `POST /conversations` · `GET /conversations/:id` · `GET/POST /conversations/:id/messages` · `POST /conversations/:id/read` |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` |
| Users | `GET /users/:id` · `GET /users/me/saved` · `POST/DELETE /users/me/saved/:id` |
| Reports | `POST /reports` (`targetType` = listing or user, `reason`, `details`) |
| Admin (admin role only) | `GET /admin/stats` · `GET /admin/users` · `GET /admin/users/:id` · `POST /admin/users/:id/cnic` · `PATCH /admin/users/:id` (ban, unban) · `GET /admin/verifications` · `GET /admin/users/:id/documents/:kind` · `PATCH /admin/users/:id/verification` (approve, reject) · `GET /admin/listings` · `PATCH /admin/listings/:id` (remove, restore) · `DELETE /admin/listings/:id` · `GET /admin/reports` · `PATCH /admin/reports/:id` · `POST /admin/broadcast` |

**Socket.IO events** (server → client): `notification:new`, `notification:count`, `message:new`, `conversation:read`, `typing`, `presence`.

---

## 🧪 Tests
```bash
cd backend
npm test
```
Covers admin permissions, reporting, moderation (removal, bans that end sessions instantly), CNIC reveal, identity checks and broadcasts, plus registration/normalisation, duplicate detection, login/logout with the cookie, monthly-rentals-only rules (no hostels, 1-month minimum), role checks, image validation, privacy of contact info & location, the full booking → accept → review flow, messaging permissions & unread counts, saved listings and NoSQL-injection attempts.
(The first run downloads a MongoDB binary for `mongodb-memory-server`.)

---

## 🌍 Deploying

Everything runs locally for now. When you go online later: serve the frontend and API from the same domain (or sub-domains like `dwellgb.pk` + `api.dwellgb.pk`) so the login cookie works, set `NODE_ENV=production` (the cookie becomes HTTPS-only), use a hosted MongoDB, add your production URL to `CLIENT_URLS`, Google and Mapbox, and set `VITE_API_URL` if the API is on another domain.

---

## 📱 Mobile app
The Expo app in `mobile/` was written for the v1 API (numeric ids, `rent_amount`, plain arrays). The v2 API changed those shapes, so the mobile app needs an update pass before it works again: log in through the cookie-based API (or add a token header option on the backend), and map the new listing fields (`rent`, `district`, `area`, `propertyType`, paginated `{ items }` responses).

---

## ⚖️ Honesty notes
- **CNIC is stored, not verified.** Real verification needs NADRA's API, which is only available to licensed institutions. CNICs are never shown to other users.
- Payments are intentionally not handled in-app; tenants are warned never to pay before visiting.
