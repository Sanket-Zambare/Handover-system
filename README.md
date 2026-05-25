# Edify OS — Execution Tracker

A task and project execution dashboard for the Edify Externship team. Built with React 19 + Vite + Supabase.

---

## What It Does

- **Briefing tab** — daily view of overdue, stuck, and urgent tasks per user
- **Tasks tab** — full task list with priority/status filters
- **Projects tab** — project health, context, and linked Google Drive folders
- **Admin tab** — add team members and projects (admin role only)

Roles: `admin`, `supervisor`, `member`. Supervisors can set escalation flags on tasks.

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/gaforedify-arch/fan-arena.git
cd fan-arena
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Get the values from [Supabase → Project Settings → API](https://app.supabase.com).

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run

```bash
npm run dev
```

---

## Supabase Setup (for a new project)

If you are connecting to an existing Supabase project, the tables are already set up. Skip to [Adding Users](#adding-users).

To set up fresh, run the migration in `supabase/migrations/202605211_user_system_uuid_refactor.sql` in the Supabase SQL editor. This creates `users`, and migrates `tasks` and `projects` to use UUIDs.

### Required Tables

| Table | Description |
|-------|-------------|
| `users` | Team members with roles and display info |
| `tasks` | Tasks linked to projects and assignees |
| `projects` | Projects with owner, coordinator, brief, context |

### Row-Level Security

Make sure RLS is enabled on all tables and policies allow authenticated users to read/write. The app uses the anon key client-side, so RLS policies are the only access control layer.

---

## Adding Users

Adding a user is a two-step process (Supabase separates auth from app data):

1. Go to **Admin tab → Users → Add Team Member**, fill the form, and click **Create User**. This creates the row in the `users` table.
2. Go to **Supabase dashboard → Authentication → Users → Add User** and create the login with the same email and password.
3. Copy the UUID from Supabase Auth into the `auth_id` column of the `users` table row.

---

## Deployment (Netlify)

1. Push the repo to GitHub.
2. Connect the repo on [netlify.com](https://www.netlify.com).
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in **Netlify → Site Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

## Deployment (Vercel)

1. Push to GitHub and import on [vercel.com](https://vercel.com).
2. Vite is auto-detected — no extra config needed.
3. Add the two env vars in **Vercel → Settings → Environment Variables**.
4. Deploy.

---

## Team (as of handover)

| Name | Short | Role |
|------|-------|------|
| N Nidhi | Nidhi | Supervisor |
| Khushboo Nitnaware | Khushboo | Member |
| S Mannmad Rao | Mannmad | Member |
| External Team | External | Member |
| Strategist | You | Admin |

---

## Tech Stack

- **Frontend**: React 19, Vite 8
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Styling**: Inline styles (no CSS framework)
- **No custom server** — fully serverless
