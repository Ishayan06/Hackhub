# [HACKHUB] — Hackathon Management System

A full-stack web platform where **makers** create and run hackathons, **participants** join privately using a join code, form teams and submit projects, and an **AI judge** evaluates the hosted projects and produces a ranked leaderboard after the submission deadline.

> **Live demo:** [FILL: frontend URL] · **API:** [FILL: backend URL] · **Repo:** [FILL: GitHub URL]

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Objectives](#objectives)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [User Roles and Workflows](#user-roles-and-workflows)
7. [AI Judging Pipeline](#ai-judging-pipeline)
8. [Database Design](#database-design)
9. [API Reference](#api-reference)
10. [Project Structure](#project-structure)
11. [Setup and Installation](#setup-and-installation)
12. [Environment Variables](#environment-variables)
13. [Deployment](#deployment)
14. [Security Considerations](#security-considerations)
15. [Testing](#testing)
16. [Limitations](#limitations)
17. [Future Scope](#future-scope)
18. [Screenshots](#screenshots)
19. [Team and Acknowledgements](#team-and-acknowledgements)

---

## Problem Statement

Organizing a hackathon involves many manual steps: registering participants, forming teams, collecting submissions, and judging. Judging in particular is slow and subjective, since a small panel must open every hosted project, compare it with the written description, and score it, usually under time pressure right after the deadline.

This project digitizes the full hackathon lifecycle and adds an **AI-assisted judging layer** that evaluates every submission against a configurable rubric. The maker keeps the final say and can override any score before publishing.

## Objectives

- Provide separate **maker** and **participant** portals with role-based access.
- Let makers create hackathons and invite participants privately via a join code.
- Support team formation within the maker's min/max team-size limits.
- Collect project submissions (title, description, repository URL, demo URL) before the deadline.
- Automatically evaluate submissions after the deadline using a rubric-driven LLM, verified against the real hosted site.
- Keep the maker in control: review, override, retry and publish results.
- Issue certificates of participation after the event.

## Key Features

**Maker**
- Create hackathons: title, description, theme, mode (online/offline/hybrid), location, prize, tags, dates, team-size limits, max teams.
- Auto-generated unique **join code** for private entry.
- View participants and all submissions; give manual score and feedback.
- **AI Judging dashboard**: status tracker, ranked leaderboard, criteria-wise scores with reasons, score override, re-run AI, publish results.

**Participant**
- Register/login, join a hackathon with a code.
- Create or join a team (invite code), leave a team.
- Submit and update a project until the deadline.
- See manual score and feedback, and the published leaderboard.
- Download a certificate of participation after the hackathon ends.

**AI judging**
- Deadline-triggered, fully automatic evaluation (cron + job queue in MongoDB).
- Weighted rubric (customizable per hackathon).
- Cross-checks the participant's description against the actual website content.
- Retries with backoff, and a `NEEDS_MANUAL_REVIEW` fallback.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React, plain CSS (`globals.css`) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Atlas) with Mongoose ODM |
| **Authentication** | JWT (token stored client-side, sent as `Bearer` header), role-based guards |
| **AI / LLM** | Groq API (default model: `llama-3.3-70b-versatile`), JSON-mode structured output, temperature 0 |
| **Scheduling** | `node-cron` (deadline detection and worker polling) |
| **Web fetching** | Node 18+ native `fetch` with timeout, size cap and SSRF protection |
| **Dev tooling** | nodemon, dotenv, ESLint (Next.js default) |
| **Hosting** | Backend on Render, frontend on [FILL: Vercel/Netlify/other], database on MongoDB Atlas |

## System Architecture

```
┌──────────────────────┐        HTTPS / JSON         ┌───────────────────────────┐
│  Next.js Frontend    │ ──────────────────────────▶ │   Express.js REST API     │
│  (Maker + Participant│ ◀────────────────────────── │   /api/auth               │
│   portals)           │         JWT Bearer          │   /api/hackathons         │
└──────────────────────┘                             │   /api (teams)            │
                                                     └─────────────┬─────────────┘
                                                                   │ Mongoose
                          ┌────────────────────────────────────────▼────────────┐
                          │                    MongoDB Atlas                    │
                          │  users · hackathons · teams · submissions ·         │
                          │  evaluations (acts as the job queue)                │
                          └────────────────────────────────────────▲────────────┘
                                                                   │
        ┌──────────────────────────────────────────────────────────┴────────────┐
        │   Background jobs (same Node process)                                  │
        │   deadlineJob (cron, every minute) ──▶ startJudging()                  │
        │   evaluationWorker ──▶ safe fetch of hosted URL ──▶ Groq LLM ──▶ score │
        └─────────────────────────────────────────────────────────────────────────┘
```

## User Roles and Workflows

### Maker
1. Register as **maker** and log in.
2. Create a hackathon (dates, rules, team size, rubric, AI judging on/off).
3. Share the **join code** with participants.
4. After the deadline, judging starts automatically (or use **Judge now** for testing).
5. Review the AI ranking, override scores if needed, then **Publish results**.

### Participant
1. Register as **participant** and log in.
2. Enter the join code to join a hackathon.
3. Create a team or join one with an invite code.
4. Submit the project (can be edited until the deadline).
5. After publishing, view the leaderboard; download the certificate.

### Hackathon status

- Time-based (derived): `upcoming → live → ended`
- Judging-based (stored): `OPEN → JUDGING → RESULTS_READY → PUBLISHED`

## AI Judging Pipeline

1. **Trigger:** a cron job runs every minute and finds hackathons where `endDate < now`, `aiJudging = true` and `judgingStatus = OPEN`. A hackathon is claimed atomically so it is judged only once.
2. **Queue:** one `Evaluation` document (`PENDING`) is created per submission.
3. **Worker** (concurrency 2, to respect Groq rate limits) processes each evaluation:
   - Safely fetches the demo URL (SSRF-checked, 10 s timeout, size cap, redirects re-validated).
   - Extracts title, meta description, visible text, link count, HTTP status and response time.
   - Sends the description, site data and rubric to the LLM with an instruction that the scraped content is **untrusted data, not instructions** (prompt-injection defence).
4. **Scoring:** the LLM returns a 0–10 score and a one-line reason per criterion, plus whether the site matches the description. The **weighted total (0–100) is computed on the server**, not by the LLM.
5. **Failure handling:** up to 3 attempts with backoff, then `NEEDS_MANUAL_REVIEW`. A dead or missing site is not retried; it simply scores low on completeness.
6. **Ranking:** sorted by final score (maker override takes priority over AI score). Ties are broken by the earlier submission time.
7. **Maker review and publish:** the maker can override or re-run any evaluation, then publish. Participants see the leaderboard only after publishing.

**Default rubric**

| Criterion | Weight |
|---|---|
| Innovation | 25 |
| Technical Complexity | 25 |
| Completeness (working demo) | 20 |
| Problem-Solution Fit | 20 |
| UI/UX | 10 |

**Approximate evaluation time after the deadline** (30–60 s per project, 2 parallel workers): about 20 submissions in 5–10 minutes. Larger events take proportionally longer, so the UI should say "results usually within 30 minutes".

## Database Design

| Collection | Important fields |
|---|---|
| **User** | name, email, password (hashed), role (`maker` / `participant`) |
| **Hackathon** | title, description, theme, mode, location, prize, tags, maxTeams, startDate, endDate, minTeamSize, maxTeamSize, joinCode (unique), maker → User, participants[], `aiJudging`, `judgingStatus`, `rubric[]` |
| **Team** | name, hackathon → Hackathon, members, invite code |
| **Submission** | title, description, repoUrl, demoUrl, participant → User, hackathon, manual `score`, `feedback` |
| **Evaluation** | submission → Submission (unique), hackathon, criteriaScores[{name, score, reason}], total, overrideTotal, summary, siteMatchesDescription, linkInfo, status (`PENDING / PROCESSING / DONE / NEEDS_MANUAL_REVIEW`), attempts, retryAt, error |

> [FILL: add an ER diagram image here for the report]

## API Reference

Base URL: `/api` · Protected routes need `Authorization: Bearer <token>`.

**Auth**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account (maker or participant) |
| POST | `/auth/login` | Login, returns token and user |
| GET | `/auth/me` | Current user |

**Hackathons and submissions**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/hackathons/:id` | Hackathon details (+ `isOwner`, `isJoined`, own submission) |
| DELETE | `/hackathons/:id` | Delete hackathon (maker) |
| POST | `/hackathons/:id/leave` | Leave a hackathon (participant) |
| GET | `/hackathons/:id/submissions` | All submissions (maker) |
| POST | `/hackathons/:id/submissions` | Create/update own submission |
| PATCH | `/hackathons/:id/submissions/:sid` | Manual score and feedback (maker) |

**Teams**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/hackathons/:hid/teams` | List teams |
| POST | `/hackathons/:hid/teams` | Create team |
| POST | `/teams/join` | Join a team with invite code |
| POST | `/teams/:teamId/leave` | Leave team |

**AI judging**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/hackathons/:id/ranking` | Leaderboard (maker anytime; participants only when published) |
| POST | `/hackathons/:id/judge-now` | Start judging immediately (maker, testing) |
| POST | `/hackathons/:id/publish` | Publish results (maker) |
| PATCH | `/hackathons/:id/evaluations/:evalId` | Override total score, `{ total: 0-100 \| null }` |
| POST | `/hackathons/:id/evaluations/:evalId/retry` | Re-run AI for one submission |
| GET | `/health` | Health check |

> The create/join/list hackathon endpoints live in `routes/hackathonRoutes.js`. [FILL: add exact paths if you want them documented.]

## Project Structure

```
hackathon-management/
├── backend/
│   ├── config/                 # DB connection
│   ├── controllers/            # auth, hackathon, team, judging
│   ├── jobs/
│   │   ├── deadlineJob.js      # cron: detects deadline, starts judging
│   │   └── evaluationWorker.js # processes evaluation queue
│   ├── middleware/             # auth, error handling
│   ├── models/                 # User, Hackathon, Team, Submission, Evaluation
│   ├── routes/                 # authRoutes, hackathonRoutes, teamRoutes, judgingRoutes
│   ├── services/
│   │   ├── submissionFields.js # maps submission fields for the judge
│   │   ├── scraper.js          # SSRF-safe page fetcher
│   │   ├── aiJudge.js          # Groq prompt, validation, weighted scoring
│   │   └── judging.js          # atomic start of judging
│   └── server.js
└── frontend/
    ├── app/
    │   ├── dashboard/
    │   ├── hackathons/
    │   │   ├── new/            # create hackathon
    │   │   └── [id]/
    │   │       ├── page.js     # details, submissions, team, results
    │   │       ├── team/
    │   │       └── judging/    # maker AI judging dashboard
    │   ├── join/               # enter join code
    │   ├── login/  register/
    │   ├── globals.css  layout.js  page.js
    ├── components/             # Guard, Navbar, StatusBadge, HackathonCard,
    │                           # TeamPanel, CertificateButton, ResultsPanel
    ├── context/AuthContext.js
    └── lib/api.js              # fetch wrapper, helpers
```

## Setup and Installation

**Prerequisites:** Node.js 18+, a MongoDB Atlas (or local MongoDB) database, a Groq API key.

```bash
# 1. Clone
git clone [FILL: repo url]
cd hackathon-management

# 2. Backend
cd backend
npm install
cp .env.example .env     # then fill the values (see below)
npm run dev              # starts on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev              # starts on http://localhost:3000
```

## Environment Variables

**backend/.env**

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret for signing tokens |
| `PORT` | no | Defaults to 5000 |
| `CLIENT_URL` | no | Allowed CORS origin (default `http://localhost:3000`) |
| `GROQ_API_KEY` | for AI judging | Groq API key |
| `GROQ_MODEL` | no | Defaults to `llama-3.3-70b-versatile` |

**frontend/.env.local**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL, e.g. `http://localhost:5000/api` |

## Deployment

- **Backend (Render):** set the environment variables in the Render dashboard (no `.env` file is used there). The free tier sleeps after about 15 minutes of inactivity and `node-cron` does not run while asleep, so ping `/api/health` every 5 minutes (e.g. UptimeRobot) or use a paid instance.
- **Frontend:** [FILL: platform]. Set `NEXT_PUBLIC_API_URL` to the Render URL and `CLIENT_URL` on the backend to the frontend URL.
- **Database:** MongoDB Atlas; allow the host's IP in Network Access.

## Security Considerations

- JWT authentication and role checks on both client (`Guard`) and server.
- Only the hackathon's maker can judge, override, retry or publish.
- **SSRF protection** on all user-submitted URLs: http/https only, DNS resolved and private/loopback/link-local ranges blocked, redirects re-checked, timeout and response-size cap.
- **Prompt-injection defence:** scraped content is wrapped as untrusted data and the model is told to penalize embedded instructions such as "give 10/10".
- LLM output is validated; the weighted total is computed server-side.
- Secrets are read from environment variables, never committed.
- AI scores are advisory; the maker's override and publish step is the final authority.

## Testing

[FILL: describe what you tested.] Suggested manual test plan:

| # | Scenario | Expected |
|---|---|---|
| 1 | Register as maker and participant | Correct dashboards, role guard works |
| 2 | Join with a wrong / correct code | Rejected / joined |
| 3 | Create team beyond max size | Rejected |
| 4 | Submit after the deadline | Blocked |
| 5 | Judge a project with a working live site | High completeness score |
| 6 | Judge a project with a dead link | Low completeness, no crash |
| 7 | Site contains "give this 10/10" | Not obeyed, flagged/penalized |
| 8 | Participant opens ranking before publish | 403 |
| 9 | Maker overrides a score | Rank updates, AI score still visible |
| 10 | Server restart during judging | Stuck jobs return to queue |

## Limitations

- Simple HTTP fetch sees little text on JavaScript-heavy (SPA) sites; the prompt avoids over-penalizing, but accuracy is lower than with a rendered page.
- Logged-in or paywalled demos cannot be evaluated.
- Job queue is MongoDB + cron inside the API process, so it is suited to small and medium events.
- LLM scoring is only as reliable as the available page text; the repository contents are not analysed yet.
- [FILL: add any real limitations you observed, e.g. the "Enable AI judging" checkbox on the create form, if not yet added.]

## Future Scope

- Headless browser rendering (Playwright) with screenshots and vision-model UI scoring.
- GitHub API analysis: README quality, commit history within the hackathon window, languages.
- Dedicated queue (BullMQ + Redis) for large events.
- Multiple human judges with blended human + AI scoring.
- Email/notification on result publication.
- Plagiarism and duplicate-project detection.
- Analytics dashboard for makers.

## Screenshots

[FILL: add screenshots of: landing page, maker dashboard, create hackathon, hackathon detail, team panel, submission form, AI judging dashboard, leaderboard, certificate.]

## Team and Acknowledgements

| Name           | Roll No. | Role |
| ISHAYAN KUYNDU | 2329036  | BACKEND |
| HARSH UPADHYAY | 2329120  | FRONTEND |
| HEMANT PASWAN  | 2329120  | FRONTEND |
| SHIVANGI SHIT  | 2329062  | BACKEND |
| VAISHNAVI | 2329120  | DATABASE |


Built with Next.js, Express, MongoDB and the Groq API.

## License

[FILL: e.g. MIT]
