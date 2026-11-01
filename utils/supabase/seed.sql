
-- =========================================================
-- CloseFuture - Demo Seed Data
-- =========================================================
-- Prerequisites:
-- 1. Apply the database migration scripts first.
-- 2. Register at least 1 Admin and 3 Members through Supabase Auth.
-- 3. Ensure their profiles have the correct roles:
--      admin
--      member
--
-- This script creates sample ideas across all workflow statuses.
-- It does not create Auth users or passwords.
-- =========================================================

DO $$
DECLARE
    v_author_id uuid;
    v_admin_count integer;
    v_member_count integer;
BEGIN
    -- Verify that an Admin account exists.
    SELECT COUNT(*)
    INTO v_admin_count
    FROM public.profiles
    WHERE role = 'admin';

    -- Verify that at least three Member accounts exist.
    SELECT COUNT(*)
    INTO v_member_count
    FROM public.profiles
    WHERE role = 'member';

    IF v_admin_count < 1 OR v_member_count < 3 THEN
        RAISE EXCEPTION
          'Please register at least 1 Admin and 3 Members before running this seed script.';
    END IF;

    -- Use the earliest registered Member as the sample submitter.
    SELECT id
    INTO v_author_id
    FROM public.profiles
    WHERE role = 'member'
    ORDER BY created_at
    LIMIT 1;

    WITH sample_ideas (
        title,
        category,
        problem,
        proposed_solution,
        who_benefits,
        expected_impact,
        rough_effort,
        status,
        impact_score,
        effort_score,
        owner_id,
        target_date,
        demo_video_url
    ) AS (
        VALUES
        (
            'AI-Powered Project Knowledge Hub',
            'Internal Tool',
            'Project information is scattered across documents.',
            'Create an AI-powered searchable knowledge hub.',
            'Employees and project teams',
            'Improve access to project knowledge.',
            'Medium',
            'Draft',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Smart Employee Onboarding Assistant',
            'Internal Tool',
            'New employees need help finding onboarding information.',
            'Build an assistant that answers onboarding questions.',
            'HR teams and new employees',
            'Reduce onboarding effort.',
            'Medium',
            'Submitted',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Automated Report Generator',
            'Process Improvement',
            'Preparing reports manually takes time.',
            'Generate reports using approved business data.',
            'Business and reporting teams',
            'Reduce manual reporting work.',
            'Small',
            'Needs More Info',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Smart AI Opportunity Analyzer',
            'New Service Offering',
            'Businesses find it difficult to identify AI opportunities.',
            'Analyze workflows and estimate potential ROI.',
            'Business owners and consultants',
            'Support informed AI investment decisions.',
            'Large',
            'Under Evaluation',
            5,
            4,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'AI Learning Recommendation Platform',
            'Training',
            'Employees may struggle to identify relevant learning paths.',
            'Recommend learning resources based on skills and goals.',
            'Employees and training teams',
            'Improve learning and development.',
            'Medium',
            'Approved',
            4,
            2,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Client AI Adoption Dashboard',
            'Client Experience',
            'Clients may not understand the value of implemented AI solutions.',
            'Display usage, automation activity and estimated benefits.',
            'Clients and customer success teams',
            'Improve transparency and AI adoption.',
            'Medium',
            'In Progress',
            4,
            3,
            v_author_id,
            CURRENT_DATE + 30,
            NULL::text
        ),
        (
            'Reusable AI Workflow Marketplace',
            'New Service Offering',
            'Teams repeatedly build similar AI workflows.',
            'Provide reusable and customizable AI workflow templates.',
            'Businesses and developers',
            'Reduce repeated development effort.',
            'Large',
            'Done',
            5,
            4,
            v_author_id,
            CURRENT_DATE - 5,
            'https://www.youtube.com/watch?v=jNQXAC9IVRw'
        ),
        (
            'Intelligent CRM Follow-up Assistant',
            'Process Improvement',
            'Manual client follow-ups can be missed.',
            'Track interactions and suggest timely follow-ups.',
            'Sales and relationship teams',
            'Improve response time and client relationships.',
            'Medium',
            'Parked',
            3,
            3,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'AI Proposal Generator',
            'Marketing/Content',
            'Preparing business proposals requires repeated manual work.',
            'Generate proposal drafts from approved project information.',
            'Sales and business development teams',
            'Reduce proposal preparation time.',
            'Medium',
            'Rejected',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Smart Campus Lost and Found',
            'Internal Tool',
            'Finding lost items on campus can be difficult.',
            'Create a platform to report and locate lost items.',
            'Students and campus staff',
            'Make lost-item recovery easier.',
            'Small',
            'Withdrawn',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        )
    ),
    inserted_ideas AS (
        INSERT INTO public.ideas (
            title,
            category,
            problem,
            proposed_solution,
            who_benefits,
            expected_impact,
            rough_effort,
            status,
            submitted_at,
            impact_score,
            effort_score,
            owner_id,
            target_date,
            demo_video_url
        )
        SELECT
            s.title,
            s.category,
            s.problem,
            s.proposed_solution,
            s.who_benefits,
            s.expected_impact,
            s.rough_effort,
            s.status,
            CASE
                WHEN s.status = 'Draft' THEN NULL
                ELSE now()
            END,
            s.impact_score,
            s.effort_score,
            s.owner_id,
            s.target_date,
            s.demo_video_url
        FROM sample_ideas s
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.ideas existing
            WHERE existing.title = s.title
        )
        RETURNING id
    )
    INSERT INTO public.idea_private_details (
        idea_id,
        submitter_id
    )
    SELECT
        id,
        v_author_id
    FROM inserted_ideas;

    RAISE NOTICE 'CloseFuture sample ideas have been inserted.';
END;
$$;
