# CampusLink

> A platform for college students to find teammates, build hackathon teams, and connect with people who share their skills and interests.

---

## Tech decisions (know these for interviews)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (plain) | No SSR needed — data is behind auth, not public |
| Backend | Node.js + Express | Explicit middleware control, great for explaining in interviews |
| Database | PostgreSQL | Relational data (users ↔ connections ↔ groups) — the right tool |
| Auth | JWT + httpOnly refresh cookies | Stateless access tokens, XSS-safe refresh |
| Hosting | Vercel (frontend) + Railway (backend + DB) | Free tiers, real deployments |

---

## Project structure

```
campuslink/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.js          # Postgres connection pool
│   │   │   └── migrate.js       # Schema + indexes (run once)
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification
│   │   ├── controllers/
│   │   │   ├── auth.js          # register, login, refresh, logout
│   │   │   ├── users.js         # browse, profile, skills
│   │   │   ├── connections.js   # send request, respond, inbox
│   │   │   └── groups.js        # create, join, manage
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── connections.js
│   │   │   └── groups.js
│   │   └── index.js             # Express app, middleware stack
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── lib/
    │   │   ├── api.js            # All fetch calls, token refresh flow
    │   │   └── AuthContext.jsx   # Global auth state
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── UserCard.jsx
    │   │   └── SkillPill.jsx
    │   ├── pages/
    │   │   ├── Auth.jsx          # Login + Register
    │   │   ├── Discover.jsx      # Browse + filter users
    │   │   ├── Connections.jsx   # Inbox, sent, connected
    │   │   ├── Groups.jsx        # Browse + create groups
    │   │   └── Profile.jsx       # Edit own profile + skills
    │   ├── App.jsx               # Routing + protected routes
    │   ├── main.jsx
    │   └── index.css             # Design system variables
    └── package.json
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install

# Create .env from template
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Run migrations (creates all tables + indexes)
node src/db/migrate.js

# Start dev server
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install

# Create .env
echo "VITE_API_URL=http://localhost:3001" > .env

npm run dev
# → http://localhost:5173
```

---

## API overview

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /users                    # browse (?skill=React&level=building&year=3)
GET    /users/:id
PUT    /users/me
POST   /users/me/skills
DELETE /users/me/skills/:id

POST   /connections              # send request
PUT    /connections/:id          # accept / reject
GET    /connections/me           # inbox (?type=received|sent|accepted)

GET    /groups                   # open groups
POST   /groups
POST   /groups/:id/join
PUT    /groups/:id/members/:userId
```

---

## Key design decisions to explain in interviews

**Why skills is a separate table, not JSONB?**
We need to query "find users who know React at building+". That's a `JOIN` on a normalized table. Can't do it cleanly on a JSON array.

**How do you prevent duplicate connection requests?**
Two layers: application check (both directions) + DB unique index on `LEAST(a,b), GREATEST(a,b)`. Even in a race condition, the DB constraint catches it.

**Why reject rows stay in the DB?**
Prevents spam. If A's request is rejected, the row blocks A from re-sending to B.

**Why short-lived access tokens + httpOnly refresh cookies?**
JWTs can't be invalidated. Short expiry (15min) limits exposure. Refresh token in httpOnly cookie can't be stolen by XSS.

**Why not Next.js?**
All data is behind auth — no public pages to index. SSR adds complexity with zero benefit here.
