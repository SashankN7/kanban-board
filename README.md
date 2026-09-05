# Kanban Board

**Full-stack task board** with drag-and-drop, real-time search and filtering, labels, team members, comments, and an activity log — with per-user data isolation enforced in the database.

**[Live app →](https://kanban-board-neon-eight.vercel.app)** — no signup, it drops you straight into your own board.

Built with React 19, Vite, and Supabase (Postgres). Deployed on Vercel.

---

## Features

- **Drag-and-drop across columns**, applied optimistically — the card moves on `dragend` and the write goes out behind it, so reordering never waits on a round trip.
- **Zero-friction entry** via Supabase anonymous authentication. A guest session is created on first load and persisted, so a visitor gets a real, private, durable board without an email or password.
- **Search and multi-criteria filtering** — free-text search combined with priority and label filters, applied together against the task set.
- **Task detail view** with description, priority, due date, label assignment, member assignment, threaded comments, and a per-task activity log.
- **Labels and team members** are user-defined, each with a name and color, managed in their own modals.

## Data model

Five related tables in Supabase Postgres:

| Table | Holds |
|---|---|
| `tasks` | title, description, status, priority, due date |
| `labels` | user-defined tags with colors |
| `team_members` | assignable people with colors |
| `comments` | per-task discussion |
| `activity_log` | per-task change history |

Relationships are UUID-based, and **Row-Level Security is enabled on every table**, so a session can only ever read or write its own rows. Isolation is enforced by Postgres policies rather than by client-side filtering — the guarantee holds even against a hand-crafted request.

## Running locally

```bash
git clone https://github.com/SashankN7/kanban-board.git
cd kanban-board
npm install
npm run dev
```

Create a `.env.local` with your own Supabase project:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is safe in the client — it's the RLS policies, not key secrecy, that enforce isolation. You'll need to create the five tables above and enable anonymous sign-ins in your Supabase auth settings.

## Deployment

Pushed to `main` → Vercel builds and deploys automatically. Set the two `VITE_` variables in the Vercel project settings.

## Stack

React 19 · Vite · Supabase (Postgres, Auth, Row-Level Security) · Vercel
