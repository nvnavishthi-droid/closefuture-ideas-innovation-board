# CloseFuture – Ideas & Innovation Board

A web-based platform that helps organizations collect, evaluate, manage, and track employee ideas and innovations.

## Overview

CloseFuture provides a centralized space where employees can submit innovative ideas, collaborate through comments, vote on ideas, and follow their progress.

Administrators can evaluate submissions, assign owners, manage idea status, and monitor implementation progress.

The platform aims to encourage innovation, improve collaboration, and turn valuable ideas into actionable projects.

## Key Features

### Authentication and User Management
- Email and password authentication.
- Member and Administrator roles.
- Role-based access control.
- User profile management.

### Idea Management
- Submit new ideas.
- Save ideas as drafts.
- Edit eligible submissions.
- Delete draft ideas.
- Submit ideas anonymously.
- Categorize ideas by business area.

### Community Collaboration
- Browse submitted ideas.
- Search and filter ideas.
- Sort ideas by votes and recent activity.
- Vote and remove votes.
- Follow and unfollow ideas.
- Add comments and replies.
- Edit or delete comments within the allowed time limit.

### Idea Evaluation and Administration
- Dedicated administrator dashboard.
- Review submitted ideas.
- Evaluate impact and implementation effort.
- Automatically classify ideas into evaluation quadrants.
- Approve, reject, park, or request additional information.
- Assign and reassign idea owners.
- Track status history and ownership changes.

### Implementation Tracking
- Track approved ideas through implementation.
- Set target completion dates.
- Add progress updates.
- Monitor overdue ideas.
- Upload demonstration videos.
- Add external demo links and outcome summaries.

### Idea Evaluation Quadrants

| Quadrant | Description |
|---|---|
| Quick Win | High impact, low effort |
| Big Bet | High impact, high effort |
| Fill-in | Low impact, low effort |
| Not Worth It | Low impact, high effort |

## Idea Workflow

Ideas move through the following statuses:

`Draft → Submitted → Under Evaluation → Approved → In Progress → Done`

Additional statuses include:
- Needs More Info
- Rejected
- Parked
- Withdrawn

The platform enforces permitted status transitions and records status history.

## User Roles

**Member**
- Submit and manage personal ideas.
- Browse community ideas.
- Vote, comment, and follow ideas.
- Track owned and followed ideas.
- Update implementation progress when assigned as an owner.

**Administrator**
- Access the administrator dashboard.
- Review and evaluate submissions.
- Manage idea statuses.
- Assign and reassign owners.
- Monitor implementation and overdue ideas.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Server Actions and Route Handlers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Security | Row Level Security (RLS) |
| File Storage | Supabase Storage |
| Version Control | GitHub |

## Project Structure

```text
closefuture/
│
├── app/
│   ├── admin/
│   ├── dashboard/
│   ├── ideas/
│   ├── login/
│   ├── register/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
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
│   └── seed.sql
│
├── AGENTS.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase account
- GitHub account

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/closefuture-ideas-innovation-board.git
```

Replace `YOUR-GITHUB-USERNAME` with your GitHub username.

### 2. Open the Project

```bash
cd closefuture-ideas-innovation-board
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file in the project root.

Add your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use your own Supabase project values. Never upload `.env.local` or private credentials to GitHub.

### 5. Configure Supabase

The `supabase/` directory contains the database setup scripts.

- `001_initial_schema.sql` – Database tables, relationships, constraints, indexes, and RLS enablement.
- `002_functions_policies_and_storage.sql` – Database functions, RLS policies, permissions, and demo storage configuration.
- `seed.sql` – Sample idea records for demonstration.

For a fresh Supabase project, review and apply the migration scripts in order. Register users through Supabase Auth and configure the administrator role separately.

Review the SQL against the target database before execution. Do not run these scripts against an existing production database without checking for conflicts.

### 6. Run the Development Server

```bash
npm run dev
```

Open the following address in your browser:

```text
http://localhost:3000
```

## Security

CloseFuture uses multiple security mechanisms:

- Supabase Authentication for user login.
- Role-based authorization for administrative operations.
- PostgreSQL Row Level Security.
- Database functions for sensitive operations.
- Anonymous submission privacy.
- Server-side authorization checks.
- Private Supabase Storage for demonstration videos.

Sensitive operations are validated on the backend rather than relying only on frontend restrictions.

## Database Design

The application uses the following main tables:

- `profiles`
- `ideas`
- `idea_private_details`
- `idea_votes`
- `idea_followers`
- `idea_comments`
- `idea_status_history`
- `idea_owner_history`
- `idea_progress_updates`

These tables maintain idea information, user relationships, collaboration activities, and implementation history.

## Future Enhancements

- Email and in-app notifications.
- Integration with project management tools.
- Advanced analytics and reporting.
- AI-powered idea recommendations.
- Automated duplicate idea detection.
- Collaboration and team-based innovation features.

## Project Status

The core application features have been implemented, including authentication, idea management, community collaboration, administrator evaluation, workflow tracking, and demonstration video handling.

## Author

**Navishthi N V**

B.E. Computer Science and Engineering

