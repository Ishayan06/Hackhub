# HackHub — Hackathon Management System

Next.js (frontend) + Express.js (backend) + MongoDB.

- **Maker** → creates hackathons, gets an auto-generated 6-char **join code**, sees participants, scores submissions.
- **Participant** → browses hackathons, joins using the **join code**, submits a project, sees score/feedback.

## Folder structure

```
hackathon-management/
├── backend/
│   ├── server.js
│   ├── config/db.js
│   ├── models/        User.js, Hackathon.js, Submission.js
│   ├── middleware/    auth.js (protect + role check), optionalAuth.js, error.js
│   ├── controllers/   authController.js, hackathonController.js, submissionController.js
│   └── routes/        authRoutes.js, hackathonRoutes.js
└── frontend/
    ├── app/
    │   ├── page.js                    landing
    │   ├── login/  register/          auth (choose role on signup)
    │   ├── dashboard/                 role-based: my hackathons / joined hackathons
    │   ├── hackathons/page.js         explore (search + status filter)
    │   ├── hackathons/new/            maker: create hackathon
    │   ├── hackathons/[id]/           detail: join code, participants, submissions
    │   └── join/                      participant: enter code
    ├── components/    Navbar, HackathonCard, StatusBadge, Guard
    ├── context/       AuthContext.js
    └── lib/api.js
```

## Run locally

Make sure MongoDB is running (local or Atlas).

**Backend**
```bash
cd backend
cp .env.example .env     # set MONGO_URI and JWT_SECRET
npm install
npm run dev              # http://localhost:5000
```

**Frontend**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

## API

| Method | Route | Who | What |
|---|---|---|---|
| POST | `/api/auth/register` | public | name, email, password, role (`maker`/`participant`) |
| POST | `/api/auth/login` | public | returns JWT |
| GET | `/api/auth/me` | logged in | current user |
| GET | `/api/hackathons?q=&status=` | public | list (join codes hidden) |
| GET | `/api/hackathons/:id` | public | detail (code + participants only for owner) |
| GET | `/api/hackathons/mine` | logged in | maker: created, participant: joined |
| POST | `/api/hackathons` | maker | create (code auto-generated) |
| PUT / DELETE | `/api/hackathons/:id` | owner maker | edit / delete |
| POST | `/api/hackathons/join` | participant | body `{ code }` |
| POST | `/api/hackathons/:id/leave` | participant | leave |
| POST | `/api/hackathons/:id/submissions` | joined participant | create/update own submission (only while live) |
| GET | `/api/hackathons/:id/submissions` | owner maker | all submissions |
| PATCH | `/api/hackathons/:id/submissions/:submissionId` | owner maker | score (0–100) + feedback |

## Flow to test

1. Register one user as **Maker**, another as **Participant** (use two browsers / incognito).
2. Maker → Create hackathon → copy the join code from the detail page.
3. Participant → Join → enter code → submit project once the hackathon is live.
4. Maker → open hackathon → score the submission.
