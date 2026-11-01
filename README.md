# CloseFuture – Ideas & Innovation Board

A role-based web application designed to help organizations collect, manage, evaluate, and track employee ideas through a structured innovation workflow.

## Project Overview

CloseFuture – Ideas & Innovation Board provides a centralized platform where members can submit ideas, collaborate through discussions, vote on ideas, and follow interesting submissions.

Administrators can review ideas, evaluate their impact and effort, assign owners, and monitor implementation progress.

The platform encourages innovation, improves collaboration, and makes idea management more transparent.

## Key Features

### Member Features
- User registration and login.
- Submit new ideas and save drafts.
- Edit eligible submissions and delete drafts.
- Submit ideas anonymously.
- View and search community ideas.
- Filter ideas by status, category, owner, and evaluation quadrant.
- Sort ideas by votes, newest, and recently updated.
- Vote and remove votes on eligible ideas.
- Comment on ideas and participate in discussions.
- Follow and unfollow ideas.
- Track drafts, submissions, owned ideas, and followed ideas.
- View implementation progress and demo details.

### Admin Features
- Admin dashboard and idea review queue.
- Review submitted ideas.
- Request additional information.
- Evaluate ideas using impact and effort scores.
- Categorize ideas into evaluation quadrants.
- Approve, reject, park, and manage idea statuses.
- Assign and reassign idea owners.
- View anonymous submitter identities through authorized access.
- Track overdue ideas and status history.

### Implementation Tracking
- Assign an owner and target date.
- Add implementation progress updates.
- Upload demo videos or provide supported external demo links.
- Add outcome summaries for completed ideas.
- Maintain status transition history.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Server Actions and Server Components |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Backend Services | Supabase |
| File Storage | Supabase Storage |
| Version Control | Git and GitHub |

## User Roles

**Member**
- Submit and manage ideas.
- Vote, comment, and follow ideas.
- View community submissions.
- Track assigned work and progress.

**Admin**
- Review and evaluate ideas.
- Manage idea statuses.
- Assign owners and monitor implementation.
- Access anonymous submitter details through authorized functionality.

## Idea Workflow

The main workflow is:

Draft → Submitted → Under Evaluation → Approved → In Progress → Done

Additional statuses:
- Needs More Info
- Rejected
- Parked
- Withdrawn

Status transitions are controlled by role-based permissions and application business rules.

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- A Supabase account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/closefuture-ideas-innovation-board.git
cd closefuture-ideas-innovation-board
```

Replace `YOUR-GITHUB-USERNAME` with your GitHub username.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholders with your Supabase project details.

**Security:** Never upload `.env.local`, passwords, service-role keys, or other secret credentials to GitHub.

### 4. Configure Supabase

- Create a Supabase project.
- Configure email/password authentication.
- Apply the database schema, SQL functions, and Row Level Security policies.
- Configure the `idea-demos` Storage bucket and its access policies.

Database setup scripts and seed data will be maintained in the repository's `supabase/` directory.

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database and Security

The application uses PostgreSQL with Supabase Row Level Security (RLS).

Security features include:
- Role-based access for Members and Admins.
- Database-level access policies.
- Controlled database functions for important operations.
- Restrictions on voting for one's own ideas.
- Anonymous submitter identity protection.
- Authorization checks for status changes and ownership.
- Private demo-video storage with controlled access.

## Project Structure

```text
closefuture/
├── app/
│   ├── dashboard/
│   ├── ideas/
│   ├── login/
│   ├── register/
│   └── ...
├── public/
├── utils/
├── supabase/          # Database scripts (to be added)
├── AGENTS.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── proxy.ts
├── tsconfig.json
└── README.md
```

## Future Enhancements

- Email and in-app notifications.
- Advanced analytics and reporting.
- Integration with project management tools.
- AI-assisted idea categorization and summarization.
- Enhanced collaboration features.

## Project Status

The core application workflows have been implemented and tested, including authentication, idea submission, community interaction, admin evaluation, status management, ownership assignment, progress tracking, and demo submission.

Further improvements and testing can be added in future versions.

## Author

**Navishthi N V**

CloseFuture – Ideas & Innovation Board  
Internship Project | 2026