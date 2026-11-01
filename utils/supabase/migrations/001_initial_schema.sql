
-- CloseFuture: Initial database schema
-- Creates the application tables, constraints, indexes and RLS enablement.
-- Run only when setting up a fresh Supabase project.

-- 1. Custom role type
CREATE TYPE public.user_role AS ENUM ('member', 'admin');

-- 2. Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role public.user_role NOT NULL DEFAULT 'member'::public.user_role,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ideas
CREATE TABLE public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    category TEXT NOT NULL,
    problem TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    who_benefits TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    rough_effort TEXT,
    links TEXT[] DEFAULT '{}'::TEXT[],
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Draft'::TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    impact_score SMALLINT,
    effort_score SMALLINT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_date DATE,
    demo_video_path TEXT,
    demo_video_url TEXT,
    outcome_summary TEXT,

    evaluation_quadrant TEXT GENERATED ALWAYS AS (
        CASE
            WHEN impact_score IS NULL OR effort_score IS NULL THEN NULL
            WHEN impact_score >= 3 AND effort_score < 3 THEN 'Quick Win'
            WHEN impact_score >= 3 AND effort_score >= 3 THEN 'Big Bet'
            WHEN impact_score < 3 AND effort_score < 3 THEN 'Fill-in'
            ELSE 'Not Worth It'
        END
    ) STORED,

    CONSTRAINT ideas_category_check CHECK (
        category = ANY (ARRAY[
            'New Service Offering',
            'Internal Tool',
            'Process Improvement',
            'Marketing/Content',
            'Client Experience',
            'Training'
        ]::TEXT[])
    ),
    CONSTRAINT ideas_rough_effort_check CHECK (
        rough_effort = ANY (ARRAY['Small', 'Medium', 'Large']::TEXT[])
    ),
    CONSTRAINT ideas_impact_score_check CHECK (
        impact_score >= 1 AND impact_score <= 5
    ),
    CONSTRAINT ideas_effort_score_check CHECK (
        effort_score >= 1 AND effort_score <= 5
    ),
    CONSTRAINT ideas_status_check CHECK (
        status = ANY (ARRAY[
            'Draft',
            'Submitted',
            'Needs More Info',
            'Under Evaluation',
            'Approved',
            'In Progress',
            'Done',
            'Rejected',
            'Parked',
            'Withdrawn'
        ]::TEXT[])
    )
);

-- 4. Private submission details
CREATE TABLE public.idea_private_details (
    idea_id UUID PRIMARY KEY
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    submitter_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 5. Votes
CREATE TABLE public.idea_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT one_vote_per_user_per_idea UNIQUE (idea_id, user_id)
);

-- 6. Followers
CREATE TABLE public.idea_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT one_follow_per_user_per_idea UNIQUE (idea_id, user_id)
);

-- 7. Comments
CREATE TABLE public.idea_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID
        REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT idea_comments_content_check
        CHECK (length(TRIM(BOTH FROM content)) > 0)
);

-- 8. Status history
CREATE TABLE public.idea_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL
        REFERENCES public.profiles(id),
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Owner assignment history
CREATE TABLE public.idea_owner_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL
        REFERENCES public.profiles(id),
    assigned_by UUID NOT NULL
        REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Progress updates
CREATE TABLE public.idea_progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL
        REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id),
    update_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT idea_progress_updates_update_text_check
        CHECK (length(TRIM(BOTH FROM update_text)) > 0)
);

-- 11. Indexes
CREATE INDEX idx_owner_history_idea
    ON public.idea_owner_history (idea_id, assigned_at);

CREATE INDEX idx_progress_updates_idea
    ON public.idea_progress_updates (idea_id, created_at);

CREATE INDEX idx_status_history_idea
    ON public.idea_status_history (idea_id, changed_at);

CREATE INDEX idx_ideas_owner
    ON public.ideas (owner_id);

CREATE INDEX idx_ideas_quadrant
    ON public.ideas (evaluation_quadrant);

CREATE INDEX idx_ideas_target_date
    ON public.ideas (target_date);

-- Existing schema also contains this equivalent unique index.
CREATE UNIQUE INDEX idea_followers_idea_user_unique
    ON public.idea_followers (idea_id, user_id);

-- 12. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_owner_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_progress_updates ENABLE ROW LEVEL SECURITY;
