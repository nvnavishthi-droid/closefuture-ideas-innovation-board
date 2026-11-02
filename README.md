# CloseFuture – Ideas & Innovation Board

CloseFuture is a web-based Ideas and Innovation Management Platform that helps organizations collect, evaluate, track, and implement ideas from their employees.

The platform provides a structured workflow where members can submit ideas, collaborate through comments and votes, and track progress. Administrators can evaluate ideas, assign owners, manage status transitions, and monitor the overall innovation pipeline.

## Project Overview

**Project Name:** CloseFuture – Ideas & Innovation Board

**Project Type:** Full-Stack Web Application

**Purpose:** To provide a centralized platform for managing the complete lifecycle of organizational ideas, from submission to implementation.

## Key Features

### Member Features
- User registration and login.
- Member profile management.
- Submit new ideas and save drafts.
- Edit and delete eligible ideas.
- Submit ideas anonymously.
- Browse, search, filter, and sort ideas.
- Vote and remove votes from ideas.
- Follow ideas to track updates.
- Add comments and replies.
- Edit and delete eligible comments.
- View idea status and progress updates.

### Admin Features
- Admin dashboard.
- Review submitted ideas.
- Evaluate ideas using impact and effort scores.
- View evaluation results and prioritization categories.
- Approve, reject, park, or request additional information.
- Manage idea status transitions.
- Assign and reassign idea owners.
- Set target dates.
- View status and ownership history.
- Monitor implementation progress.
- Review overdue ideas.
- View anonymous submitter information where authorized.

### Implementation Tracking
- Add progress updates.
- Upload demonstration videos.
- View uploaded demonstration videos.
- Track ideas through the workflow until completion.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | PostgreSQL Row Level Security |
| Storage | Supabase Storage |
| Version Control | Git and GitHub |

## Project Structure

```text
closefuture/
│
├── app/
│   ├── admin/
│   ├── auth/
│   ├── community/
│   ├── dashboard/
│   ├── ideas/
│   ├── login/
│   ├── register/
│   └── ...
│
├── public/
│
├── utils/
│   └── supabase/
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_functions_policies_and_storage.sql
│   │
│   └── seed.sql
│
├── proxy.ts
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git
- A Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/nvnavishthi-droid/closefuture-ideas-innovation-board.git
cd closefuture-ideas-innovation-board
```

Replace `nvnavishthi-droid` with your GitHub username.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

Create a Supabase project.

Apply the SQL scripts in the following order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_functions_policies_and_storage.sql`

Review the SQL scripts before applying them to a new database.

### 4. Create Demo Accounts

Register users through Supabase Authentication.

Create at least:

- One Admin account.
- Three Member accounts.

Configure the corresponding profiles with the appropriate roles:

- `admin`
- `member`

Demo login credentials should be shared securely with the evaluator. Do not publish passwords or private credentials in this repository.

### 5. Insert Sample Data

After creating the required accounts and applying the migrations, run:

```text
supabase/seed.sql
```

The seed script checks that one Admin and at least three Members exist before inserting sample ideas.

It creates sample ideas across the workflow statuses, including Draft, Submitted, Needs More Info, Under Evaluation, Approved, In Progress, Done, Parked, Rejected, and Withdrawn.

The seed script does not create Supabase Auth accounts or passwords.

### 6. Run the Application

```bash
npm run dev
```

Open the following address in your browser:

```text
http://localhost:3000
```

## Database Model

The application uses Supabase PostgreSQL.

| Table | Purpose |
|---|---|
| profiles | Stores user profiles and roles |
| ideas | Stores submitted ideas and workflow information |
| idea_private_details | Stores private submitter information |
| idea_votes | Stores idea votes |
| idea_followers | Stores followed ideas |
| idea_comments | Stores comments and replies |
| idea_status_history | Records status transitions |
| idea_owner_history | Records owner assignments |
| idea_progress_updates | Stores implementation progress updates |

## Security and Permissions

CloseFuture uses Supabase Authentication and PostgreSQL Row Level Security (RLS).

- Authentication is handled through Supabase Auth.
- Members can manage their own eligible ideas.
- Draft ideas are restricted to their authors and authorized administrators.
- Anonymous submitter identities are protected from ordinary Members.
- Administrative operations require Admin authorization.
- Voting, comments, status transitions, and ownership rules are enforced through database policies and backend functions.
- Demonstration videos are stored using a private Supabase Storage bucket.

## Evaluation and Prioritization

Administrators can evaluate ideas using:

- **Impact Score:** Represents the expected business value of an idea.
- **Effort Score:** Represents the estimated effort required to implement it.

These scores help administrators compare ideas and prioritize implementation.

## Idea Workflow

Ideas move through a structured lifecycle:

1. Draft
2. Submitted
3. Needs More Info
4. Under Evaluation
5. Approved
6. In Progress
7. Done

Other available outcomes include:

- Parked
- Rejected
- Withdrawn

The platform controls permitted status transitions to maintain a structured review and implementation process.

## Known Limitations

- Email and in-app notifications are not implemented.
- Slack and Jira integrations are outside the current project scope.
- A native mobile application is not included.
- The seed script requires user accounts to be registered before it can insert sample data.
- SQL migration scripts should be reviewed against a fresh Supabase project before execution.

## Walkthrough Video

The project walkthrough demonstrates:

- Member and Admin login.
- Idea submission.
- Voting and commenting.
- Idea evaluation and scoring.
- Owner assignment.
- Valid and blocked status transitions.
- Demo video upload.
- Idea completion.
- Admin Dashboard.

**Walkthrough Video Link:** Add the shareable video link after recording.

## Author

**Navishthi N V**

B.E. Computer Science and Engineering

## Repository

GitHub: https://github.com/nvnavishthi-droid/closefuture-ideas-innovation-board
