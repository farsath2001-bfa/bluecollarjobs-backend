# Jobz Dxb — Backend API

Express + MongoDB (Mongoose) REST API for the Jobz Dxb blue-collar job portal.

## Setup

```bash
npm install
cp .env.example .env      # then fill in MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed              # creates admin account + 8 companies + sample jobs (only if no jobs exist)
npm run dev               # http://localhost:5000/api
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start for production (Render) |
| `npm run seed` | Add admin + companies; add sample jobs only when the jobs collection is empty |
| `npm run seed:reset` | **Deletes all jobs, applications and saved jobs**, then re-adds samples |
| `npm run create-admin` | Only create (or promote) the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

Public sign-up always creates a `candidate`. Admins are created with `npm run create-admin`, or promoted by another admin in **Admin → Users**.

## Environment variables

| Name | Example |
| --- | --- |
| `MONGO_URI` | `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/bluecollarjobs?retryWrites=true&w=majority` |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URLS` | `http://localhost:5173,https://bluecollarjobs-frontend.vercel.app` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first admin account |

On Render, add the same variables under **Environment**.

## Data model

- **User** — name, email, password (bcrypt), role (`candidate`/`admin`), phone, location, nationality, skills, experienceYears, languages, bio, resume link
- **Company** — name, logo (bundled key like `talabat.png` or image URL), industry, location, website, phone, email, isVerified
- **Job** — title, description, category, location, company (ref) + companyName/logo, salary (text) + salaryMin (parsed number), jobType, requirements[], benefits[], vacancies, applicantsCount, isActive
- **Application** — job, applicant, status (`pending` → `reviewed` → `shortlisted` → `accepted`/`rejected`), phone, coverLetter, resume, availableFrom, hasUaeVisa, adminNote
- **SavedJob** — user, job
- **Message** — contact-form messages

## Endpoints

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public (rate limited) |
| GET/PUT | `/api/auth/profile` | logged in |
| PUT | `/api/auth/password` | logged in |
| GET | `/api/jobs?keyword=&location=&category=&jobType=&minSalary=&sort=newest\|salary&page=&limit=` | public → `{ jobs, total, page, pages }` |
| GET | `/api/jobs/meta` | public — category/location counts |
| GET | `/api/jobs/:id` | public — includes `similar` jobs |
| GET | `/api/jobs/admin/all` | admin — includes closed jobs |
| POST/PUT/DELETE | `/api/jobs`, `/api/jobs/:id` | admin |
| GET | `/api/companies`, `/api/companies/:id` | public (`/api/company` also works) |
| POST/PUT/DELETE | `/api/companies`, `/api/companies/:id` | admin |
| POST | `/api/applications/:jobId` | candidate |
| GET | `/api/applications/my` | candidate |
| DELETE | `/api/applications/:id` | candidate (withdraw) |
| GET | `/api/applications?status=&job=` | admin |
| PUT | `/api/applications/:id/status` | admin |
| GET/POST/DELETE | `/api/saved`, `/api/saved/ids`, `/api/saved/:jobId` | logged in |
| POST | `/api/contact` | public (rate limited) |
| GET | `/api/admin/stats` | admin |
| GET/PUT/DELETE | `/api/admin/users`, `/api/admin/users/:id/role`, `/api/admin/users/:id` | admin |
| GET/PUT/DELETE | `/api/admin/messages`, `/api/admin/messages/:id` | admin |
