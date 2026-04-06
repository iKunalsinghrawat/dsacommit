# DSA Commit

DSA Commit is a production-ready full-stack MVP for disciplined DSA preparation. It combines structured roadmaps, company-wise problem sets, mentor guidance, streak-based accountability, a public commitment wall, community discussion, and role-based workspaces for students, mentors, companies, and admins.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma ORM
- PostgreSQL
- Secure JWT cookie auth with role guards
- Recharts
- Vitest + Testing Library
- Docker + docker-compose

## Roles

- Student
- Mentor
- Company
- Admin

## Core product areas

- Premium landing page with dark/light theme
- Student onboarding with level, goal, time, companies, weak topics, and language
- Student dashboard with today’s task, streaks, consistency scores, heatmap, bookmarks, revision queue, challenge cards, company tracker, and recommended next questions
- Roadmap, topic library, and topic detail pages
- Problem catalog and problem detail pages with hints, editorial, company tags, bookmark/revision/solve tracking
- Company pages with focus areas, OA pattern, interview rounds, tips, and tagged questions
- Mentor pages with follow, doubt posting, and guidance content
- Community feed with post creation, likes, and comments
- Company portal with role publishing, guidance/event publishing, and committed student discovery
- Admin panel for featured content and moderation

## Database

The Prisma schema lives at `prisma/schema.prisma`. An initial SQL migration is included at `prisma/migrations/0001_init/migration.sql`.

Main models include:

- `User`
- `StudentProfile`
- `MentorProfile`
- `CompanyProfile`
- `Topic`
- `Problem`
- `ProblemCompanyTag`
- `Progress`
- `SubmissionStatus`
- `Bookmark`
- `RevisionQueue`
- `DailyCheckin`
- `Streak`
- `Challenge`
- `ChallengeParticipation`
- `CommitmentPost`
- `CommunityPost`
- `Comment`
- `Badge`
- `UserBadge`

## Local setup

1. Copy envs.

```bash
cp .env.example .env
```

2. Start PostgreSQL locally.

Option A: use Docker Compose.

```bash
docker compose up -d db
```

Option B: use your own PostgreSQL instance and update `DATABASE_URL`.

3. Install dependencies.

```bash
npm install
```

4. Apply migrations and generate the client.

```bash
npx prisma migrate deploy
npm run db:generate
```

5. Seed demo data.

```bash
npm run db:seed
```

6. Start the app.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo credentials

Admin:

- `admin@dsacommit.dev`
- `Admin@123`

Shared seeded password for student, mentor, and company demo users:

- `Commit@123`

Examples:

- Student: `student01@dsacommit.dev`
- Mentor: `aarav@dsacommit.dev`
- Company: `google@dsacommit.dev`

## Useful commands

```bash
npm run lint
npm run test
npm run build
npm run db:seed
npm run db:studio
```

## Docker

Run the full stack with Docker Compose:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- Next.js app on `localhost:3000`

The compose startup command runs:

- `prisma migrate deploy`
- `npm run db:seed`
- `npm start`

## Deployment

### Recommended free hosting

#### Option 1: Vercel Hobby + Neon Free

This is the easiest path for a demo, portfolio, or personal MVP.

Important: Vercel documents that the Hobby plan is for non-commercial personal use only. If you plan to operate this as a commercial product, choose the Netlify option below or move to a paid Vercel plan.

1. Create a free PostgreSQL database on Neon and copy the pooled `DATABASE_URL`.
2. Push this repo to GitHub.
3. Import the repo into Vercel.
4. In Vercel project settings, add:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_DEFAULT_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

5. Set `NEXT_PUBLIC_APP_URL` to your production domain if you already know it. If not, you can leave it blank for the first deploy because the app now falls back to Vercel system URLs automatically.
6. Deploy the app.
7. Run database setup once against production:

```bash
npx prisma migrate deploy
npm run db:seed
```

You can run those commands locally after pointing your local `.env` to the Neon production database, or from any CI/CD job with the same environment variables.

If you enable Vercel preview deployments, use a separate preview database. Prisma's official Vercel guidance warns against pointing preview deployments at the same database when schema changes are involved.

#### Option 2: Netlify Free + Neon Free

Use this when you want a no-cost public deployment without the Vercel Hobby non-commercial restriction.

1. Create a free PostgreSQL database on Neon and copy the pooled `DATABASE_URL`.
2. Push this repo to GitHub.
3. Import the repo into Netlify.
4. Netlify should auto-detect Next.js. If it asks for settings, use:

- Build command: `npm run build`
- Publish directory: leave the default value so Netlify can use its Next.js runtime

5. Add these environment variables in Netlify:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_DEFAULT_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

6. Deploy the site.
7. Run database setup once against production:

```bash
npx prisma migrate deploy
npm run db:seed
```

The app now falls back to Netlify runtime URLs automatically, so `NEXT_PUBLIC_APP_URL` is optional for the first deploy, but still recommended for explicit canonical URLs.

#### Supabase note

Supabase is also a valid free PostgreSQL option. I recommend Neon as the default for this project because its pooled connection string and scale-to-zero setup are a smooth fit for this Next.js + Prisma deployment.

### Generic Node host

```bash
npm install
npm run build
npx prisma migrate deploy
npm run db:seed
npm start
```

## Testing and verification

Implemented verification steps:

- `npm run lint`
- `npm run build`
- `npm run test`

## Project structure

```text
src/
  app/               App Router routes
  components/        Reusable UI and feature components
  data/              Seeded brand, roadmap, company, mentor, and problem content
  generated/         Generated Prisma client
  lib/               Auth, actions, validation, utilities, Prisma runtime
  server/            Read-model queries for public and protected routes
prisma/
  migrations/        Initial SQL migration
  seed.ts            Seed pipeline for demo data
```

## Known limitations

- No remote code execution engine is included in this MVP.
- Community moderation is intentionally lightweight.
- Mentor mock interview slot booking is represented as a workflow placeholder rather than a calendar integration.
- Company portal is single-owner in this MVP rather than multi-member.
- Search is filter-driven and server-rendered, not full-text indexed yet.

## Next-phase improvements

- Add an embedded editor with secure code execution sandboxing
- Add email verification and password reset flows
- Add notification scheduling for revision reminders
- Add richer admin CRUD and analytics
- Add mentor slot booking and thread replies
- Add company multi-user teams and recruiter views
- Add full-text search and better recommendation ranking
