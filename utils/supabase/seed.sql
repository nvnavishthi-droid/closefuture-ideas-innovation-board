-- ============================================================
-- CloseFuture: Sample seed data
-- Requires at least one existing member profile.
-- Users must register through Supabase Auth separately.
-- ============================================================

DO $$
DECLARE
    v_author_id uuid;
BEGIN
    SELECT id
    INTO v_author_id
    FROM public.profiles
    WHERE role = 'member'
    ORDER BY created_at
    LIMIT 1;

    IF v_author_id IS NULL THEN
        RAISE EXCEPTION
            'Please register at least one member account before running seed data.';
    END IF;

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
            'Project information is scattered across documents and conversations.',
            'Create a searchable AI-powered knowledge hub for project information.',
            'Developers, project managers and employees',
            'Reduce time spent searching for project information.',
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
            'Process Improvement',
            'New employees need time to understand company processes.',
            'Create an assistant that guides employees through onboarding tasks.',
            'HR teams and new employees',
            'Improve onboarding consistency and reduce manual effort.',
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
            'Internal Tool',
            'Employees spend time preparing repetitive reports.',
            'Generate structured reports from approved business data.',
            'Analysts and management teams',
            'Reduce repetitive reporting work.',
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
            'Businesses struggle to identify suitable AI automation opportunities.',
            'Analyze workflows and estimate potential AI automation benefits.',
            'Business owners and AI consultants',
            'Support informed AI investment decisions.',
            'Large',
            'Under Evaluation',
            5::smallint,
            4::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'AI Learning Recommendation Platform',
            'Training',
            'Employees find it difficult to identify relevant learning resources.',
            'Recommend learning paths based on employee skills and goals.',
            'Employees and training teams',
            'Improve skill development and learning efficiency.',
            'Medium',
            'Approved',
            4::smallint,
            2::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Client AI Adoption Dashboard',
            'Client Experience',
            'Clients may not understand the value of implemented AI solutions.',
            'Track usage, automation activity and estimated business benefits.',
            'Clients and customer success teams',
            'Improve transparency and AI adoption.',
            'Medium',
            'In Progress',
            4::smallint,
            3::smallint,
            v_author_id,
            CURRENT_DATE + 30,
            NULL::text
        ),
        (
            'Reusable AI Workflow Marketplace',
            'New Service Offering',
            'Teams repeatedly build similar AI workflows.',
            'Provide reusable AI workflow templates and components.',
            'Businesses and AI developers',
            'Reduce repeated development effort.',
            'Large',
            'Done',
            5::smallint,
            4::smallint,
            v_author_id,
            CURRENT_DATE - 5,
            'https://www.youtube.com/watch?v=jNQXAC9IVRw'
        ),
        (
            'Intelligent CRM Follow-up Assistant',
            'Process Improvement',
            'Manual client follow-ups can cause missed opportunities.',
            'Track client interactions and suggest timely follow-up messages.',
            'Sales and business development teams',
            'Improve response time and client relationships.',
            'Medium',
            3::smallint,
            3::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'AI Proposal Generator',
            'Marketing/Content',
            'Preparing business proposals manually takes significant time.',
            'Generate proposal drafts using approved company information.',
            'Sales and marketing teams',
            'Reduce proposal preparation time.',
            'Medium',
            NULL::smallint,
            NULL::smallint,
            NULL::uuid,
            NULL::date,
            NULL::text
        ),
        (
            'Smart Campus Lost and Found',
            'Internal Tool',
            'Students may struggle to locate lost belongings.',
            'Create a digital platform to report and search for lost items.',
            'Students and campus administration',
            'Improve lost-item recovery and communication.',
            'Small',
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
            is_anonymous,
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
            false,
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
    SELECT id, v_author_id
    FROM inserted_ideas;

END;
$$;

-- End of CloseFuture seed data