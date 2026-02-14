# 🚀 Vault — Bookmark Manager
### A Real-Time, Secure Bookmark Manager

A production-ready bookmark manager built with **Next.js 16 (App Router)** and **Supabase**, featuring Google OAuth authentication, real-time updates, and strict per-user data isolation via Row Level Security.

🔗 **Live Demo:**https://vault-bookmarks.vercel.app
📦 **Repository:** https://github.com/teja-1206/basics

---

## 📌 Overview

Vault is a full-stack web application that enables users to:

- 🔐 Authenticate using Google OAuth (no email/password)
- ➕ Add bookmarks (title + URL)
- 🔒 Store bookmarks privately — fully isolated per authenticated user via RLS
- ⚡ Experience real-time updates across multiple browser tabs without refresh
- 🗑 Delete their own bookmarks
- 🌍 Access the app via a production Vercel deployment

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Auth & Database | Supabase (PostgreSQL + GoTrue) |
| Realtime | Supabase Realtime (WebSocket / postgres_changes) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel (Edge Network) |

---

## 🔐 Authentication Flow
```
User clicks "Continue with Google"
  → signInWithOAuth() redirects to Google
  → Google redirects to Supabase OAuth callback
  → Supabase redirects to /auth/callback?code=...
  → route.ts exchanges code for session via exchangeCodeForSession()
  → Session stored in HTTP-only cookies
  → User redirected to /dashboard
  → middleware.ts refreshes session cookie on every subsequent request
```

---

## 🧱 Architecture
```
smart-bookmarks/
├── middleware.ts                  # Session refresh + /dashboard route protection
├── src/
│   ├── app/
│   │   ├── page.tsx               # Login page (Google OAuth trigger)
│   │   ├── layout.tsx             # Root layout
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Protected dashboard (realtime bookmarks)
│   │   └── auth/
│   │       ├── callback/
│   │       │   └── route.ts       # OAuth code → session exchange
│   │       └── signout/
│   │           └── route.ts       # Server-side sign out handler
│   └── utils/
│       └── supabase/
│           ├── client.ts          # Browser client (createBrowserClient)
│           └── server.ts          # Server client (createServerClient + cookies)
```

### Realtime Flow
```
User submits bookmark form
  → insert({ title, url, user_id }) sent to Supabase
  → RLS INSERT policy validates auth.uid() = user_id
  → Row written to PostgreSQL
  → Supabase broadcasts postgres_changes event
  → Subscribed clients filtered by user_id receive INSERT payload
  → React state updated → UI reflects new bookmark instantly
```

---

## 🛡 Database Schema & Row Level Security
```sql
create table public.bookmarks (
  id         bigint      generated always as identity primary key,
  created_at timestamptz default now() not null,
  title      text        not null,
  url        text        not null,
  user_id    uuid        references auth.users(id) on delete cascade not null
);

alter table public.bookmarks enable row level security;

create policy "Individuals can view their own bookmarks."
  on public.bookmarks for select using (auth.uid() = user_id);

create policy "Individuals can create bookmarks."
  on public.bookmarks for insert with check (auth.uid() = user_id);

create policy "Individuals can delete their own bookmarks."
  on public.bookmarks for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.bookmarks;
```

RLS enforces data isolation at the database level — no application-layer filtering required. A user physically cannot read or modify another user's rows regardless of how the API is called.

---

## 🧪 Local Development

### Prerequisites

- Node.js 18+
- Supabase project with Google OAuth enabled
- Google Cloud Console OAuth 2.0 client

### Setup
```bash
git clone https://github.com/teja-1206/basics.git
cd basics
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
```bash
npm run dev
# → http://localhost:3000
```

### Supabase Configuration

1. **Authentication → Providers → Google** — enable and add Google OAuth credentials
2. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. **SQL Editor** — run the schema above
4. **Database → Publications** — confirm `bookmarks` is in `supabase_realtime`

### Google Cloud Console

Add to **Authorized redirect URIs**:
```
https://your-project-ref.supabase.co/auth/v1/callback
```

---

## 🌍 Production Deployment (Vercel)

1. Push to GitHub
2. Import repository on Vercel
3. Set environment variables:
```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_SITE_URL  →  https://my-vault-app-umber.vercel.app
```
4. Deploy
5. Update Supabase URL Configuration → add production URL and callback
6. Add production domain to Google OAuth authorized JavaScript origins

---

## 🧩 Challenges & Solutions

### 1️⃣ Wrong Supabase API key format
**Problem:** Used the `sb_publishable_` prefixed key. The `@supabase/ssr` client threw a runtime error on initialization.
**Root cause:** Supabase has two key formats — the publishable key is for a separate product. The SSR client requires the JWT-format `anon` key starting with `eyJ...`.
**Solution:** Retrieved the correct key from Supabase → Settings → API → `anon public`.

---

### 2️⃣ Session not persisting after OAuth
**Problem:** After Google login, `supabase.auth.getUser()` returned `null` on the dashboard.
**Root cause:** `middleware.ts` was missing entirely. Without it, Next.js never refreshes the Supabase session cookie between requests, so the server-side client always sees an unauthenticated state.
**Solution:** Added `middleware.ts` at the project root using `createServerClient` with `request.cookies` to intercept every request and refresh the session token.

---

### 3️⃣ Empty Supabase redirect URL list
**Problem:** Google OAuth completed but Supabase rejected the redirect back to the app.
**Root cause:** Supabase → Authentication → URL Configuration had no entries in Redirect URLs. Supabase blocks all OAuth redirects to URLs not explicitly whitelisted — a security measure to prevent open redirect attacks.
**Solution:** Added `http://localhost:3000/auth/callback` (dev) and `https://my-vault-app-umber.vercel.app/auth/callback` (production).

---

### 4️⃣ RLS blocking bookmark inserts
**Problem:** `new row violates row-level security policy for table "bookmarks"`.
**Root cause:** The insert payload was `{ title, url }` with no `user_id`. The RLS `WITH CHECK` policy requires `auth.uid() = user_id`, so any row missing an explicit `user_id` is rejected at the database level.
**Solution:** Called `supabase.auth.getUser()` fresh inside the save handler and passed `user_id: user.id` explicitly in every insert. Fetching inside the handler eliminates race conditions from stale React state.

---

### 5️⃣ Realtime not firing — required manual page refresh
**Problem:** New bookmarks only appeared after a manual refresh despite an active subscription.
**Root cause:** The Supabase channel was initialized outside the async `setup()` function, so it subscribed before `user.id` was available. The `filter` was `undefined`, meaning no events matched.
**Solution:** Moved channel subscription inside `setup()` after `getUser()` resolves. Added `filter: \`user_id=eq.${user.id}\`` to scope events to the current user only. Also ran `ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks`.

---

### 6️⃣ `MIDDLEWARE_INVOCATION_FAILED` — 500 on Vercel
**Problem:** Every route returned 500. Vercel logs showed `ReferenceError: __dirname is not defined`.
**Root cause:** Tailwind CSS v4's PostCSS plugin references `__dirname`, a Node.js CommonJS global. Next.js middleware runs on the Vercel Edge Runtime (V8 isolate) which has no Node.js globals.
**Solution:** Added `serverExternalPackages: ['@tailwindcss/postcss', 'tailwindcss']` to `next.config.ts` to exclude these packages from Edge Runtime bundling. Narrowed middleware `matcher` to `/dashboard/:path*` only.

---

## 📈 Future Improvements

- **Search & filtering** — full-text search using Supabase `ilike` or `pg_trgm`
- **Folder/tag organization** — `tags` table with many-to-many join
- **Optimistic UI** — append to local state immediately, reconcile on realtime confirmation
- **Pagination** — cursor-based for large collections
- **E2E tests** — Playwright covering OAuth, insert, realtime sync, and delete
- **Edit functionality** — inline title/URL editing

---

## 🧠 What This Project Demonstrates

- Secure OAuth with session persistence across SSR and client boundaries
- Row-level database security enforced at the PostgreSQL level
- Real-time data sync via WebSocket with user-scoped event filtering
- Production debugging across Vercel Edge Runtime, Supabase Auth, and Next.js middleware
- Environment configuration management across local and production

---

## 👨‍💻 Author

**Tejeswar B**
Built as a full-stack technical assignment showcasing production-level development practices.

---

## 📜 License

MIT
