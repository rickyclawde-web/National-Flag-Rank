# National Flag Rankings App

## Overview
A full-stack web application for managing national youth flag football rankings. Coaches vote monthly on team rankings by state, division (boys/girls), and age group (8U, 10U, 12U, 14U).

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components + dnd-kit for drag-and-drop
- **Backend**: Node.js + Express with TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Session-based (express-session + connect-pg-simple)

## User Roles
- **Public**: View rankings, submit team nominations
- **Coach**: Moderate submission pool, submit ranked ballot (drag-and-drop, 10 teams, 10-1 pts)
- **Director**: Monitor ballot windows, publish rankings, restore deleted submissions
- **Admin**: Full control — manage users, ballot windows, system settings

## Pages
- `/` — Public rankings (state selector, gender/age tabs, top 10 cards)
- `/submit` — Multi-step team nomination form (3 steps)
- `/login` — Session login with role-based redirect
- `/coach` — Coach dashboard (pool moderation + drag-and-drop ballot)
- `/director` — Director console (ballot windows, coaches, deleted submissions)
- `/admin` — Admin panel (users, ballot windows, states)

## Key Data Models
- `states` — 12 participating states (TX, FL, CA, NM, OK, LA, PA, NY, KS, CO, WA, OR)
- `teams` — Flag football teams with gender/age/state
- `submissions` — Public team nominations with status tracking
- `users` — Coaches, directors, admins with role/state assignment
- `ballot_windows` — Monthly voting windows per state/division
- `ballots` + `ballot_rankings` — Coach votes (10 teams, 10-1 points)
- `historical_rankings` — Published top-10 results per window

## Demo Accounts
All accounts use password: `password123`
- Admin: admin@flagrankings.com
- Director (TX): director.tx@flagrankings.com
- Coach (TX): coach1.tx@flagrankings.com or coach2.tx@flagrankings.com
- Alternate Coach (TX): alt1.tx@flagrankings.com

## Key Endpoints
- `GET /api/rankings?state=TX&gender=boys&ageGroup=12U` — Public rankings
- `POST /api/submissions` — Submit team nomination
- `GET /api/coach/pool` — Coach's submission pool (auth required)
- `POST /api/coach/ballots` — Submit ballot (auth required)
- `GET /api/director/dashboard` — Director overview (auth required)
- `PATCH /api/director/windows/:id/publish` — Publish rankings (auth required)
- `POST /api/admin/users` — Create user (admin only)

## Scoring
- 1st place = 10 pts, 2nd = 9 pts, ..., 10th = 1 pt
- Published when 16 coaches vote OR director overrides
- Historical snapshot kept per window

## Running
The "Start application" workflow runs `npm run dev` which starts the Express + Vite dev server on port 5000.
