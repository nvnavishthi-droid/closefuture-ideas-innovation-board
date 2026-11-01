-- ============================================================
-- CloseFuture: Functions, policies and storage
-- ============================================================

-- ============================================================
-- Part 1: Authentication and profile helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
$function$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- Part 2: Idea creation, editing, submission and deletion
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_idea(
    p_title text,
    p_category text,
    p_problem text,
    p_proposed_solution text,
    p_who_benefits text,
    p_expected_impact text,
    p_rough_effort text DEFAULT NULL,
    p_links text[] DEFAULT '{}',
    p_is_anonymous boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_idea_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to create an idea.';
    END IF;

    IF p_title IS NULL
       OR length(trim(p_title)) = 0
       OR length(p_title) > 100 THEN
        RAISE EXCEPTION 'Title must contain between 1 and 100 characters.';
    END IF;

    IF p_category NOT IN (
        'New Service Offering',
        'Internal Tool',
        'Process Improvement',
        'Marketing/Content',
        'Client Experience',
        'Training'
    ) THEN
        RAISE EXCEPTION 'Invalid idea category.';
    END IF;

    IF p_rough_effort IS NOT NULL
       AND p_rough_effort NOT IN ('Small', 'Medium', 'Large') THEN
        RAISE EXCEPTION 'Invalid rough effort.';
    END IF;

    IF p_problem IS NULL OR length(trim(p_problem)) = 0
       OR p_proposed_solution IS NULL OR length(trim(p_proposed_solution)) = 0
       OR p_who_benefits IS NULL OR length(trim(p_who_benefits)) = 0
       OR p_expected_impact IS NULL OR length(trim(p_expected_impact)) = 0 THEN
        RAISE EXCEPTION 'All required idea fields must be provided.';
    END IF;

    INSERT INTO public.ideas (
        title,
        category,
        problem,
        proposed_solution,
        who_benefits,
        expected_impact,
        rough_effort,
        links,
        is_anonymous,
        status
    )
    VALUES (
        trim(p_title),
        p_category,
        trim(p_problem),
        trim(p_proposed_solution),
        trim(p_who_benefits),
        trim(p_expected_impact),
        p_rough_effort,
        COALESCE(p_links, '{}'),
        COALESCE(p_is_anonymous, false),
        'Draft'
    )
    RETURNING id INTO v_idea_id;

    INSERT INTO public.idea_private_details (idea_id, submitter_id)
    VALUES (v_idea_id, v_user_id);

    RETURN v_idea_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_idea(
    p_idea_id uuid,
    p_title text,
    p_category text,
    p_problem text,
    p_proposed_solution text,
    p_who_benefits text,
    p_expected_impact text,
    p_rough_effort text,
    p_links text[],
    p_is_anonymous boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_current_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT i.status
    INTO v_current_status
    FROM public.ideas i
    JOIN public.idea_private_details pd ON pd.idea_id = i.id
    WHERE i.id = p_idea_id
      AND pd.submitter_id = v_user_id
    FOR UPDATE OF i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found or you are not its author.';
    END IF;

    IF v_current_status NOT IN ('Draft', 'Submitted', 'Needs More Info') THEN
        RAISE EXCEPTION 'This idea cannot be edited in its current status.';
    END IF;

    IF p_title IS NULL
       OR length(trim(p_title)) = 0
       OR length(trim(p_title)) > 100 THEN
        RAISE EXCEPTION 'Title must contain between 1 and 100 characters.';
    END IF;

    IF p_category IS NULL OR p_category NOT IN (
        'New Service Offering',
        'Internal Tool',
        'Process Improvement',
        'Marketing/Content',
        'Client Experience',
        'Training'
    ) THEN
        RAISE EXCEPTION 'Invalid idea category.';
    END IF;

    IF p_rough_effort IS NOT NULL
       AND p_rough_effort NOT IN ('Small', 'Medium', 'Large') THEN
        RAISE EXCEPTION 'Invalid rough effort.';
    END IF;

    IF p_problem IS NULL OR length(trim(p_problem)) = 0
       OR p_proposed_solution IS NULL OR length(trim(p_proposed_solution)) = 0
       OR p_who_benefits IS NULL OR length(trim(p_who_benefits)) = 0
       OR p_expected_impact IS NULL OR length(trim(p_expected_impact)) = 0 THEN
        RAISE EXCEPTION 'All required idea fields must be provided.';
    END IF;

    UPDATE public.ideas
    SET title = trim(p_title),
        category = p_category,
        problem = trim(p_problem),
        proposed_solution = trim(p_proposed_solution),
        who_benefits = trim(p_who_benefits),
        expected_impact = trim(p_expected_impact),
        rough_effort = p_rough_effort,
        links = COALESCE(p_links, '{}'),
        is_anonymous = COALESCE(p_is_anonymous, false),
        updated_at = now()
    WHERE id = p_idea_id;

    RETURN p_idea_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.submit_idea(p_idea_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_current_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT i.status
    INTO v_current_status
    FROM public.ideas i
    JOIN public.idea_private_details pd ON pd.idea_id = i.id
    WHERE i.id = p_idea_id
      AND pd.submitter_id = v_user_id
    FOR UPDATE OF i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found or you are not its author.';
    END IF;

    IF v_current_status <> 'Draft' THEN
        RAISE EXCEPTION 'Only Draft ideas can be submitted.';
    END IF;

    UPDATE public.ideas
    SET status = 'Submitted',
        submitted_at = now(),
        updated_at = now()
    WHERE id = p_idea_id;

    INSERT INTO public.idea_status_history (
        idea_id,
        from_status,
        to_status,
        changed_by,
        reason
    )
    VALUES (
        p_idea_id,
        'Draft',
        'Submitted',
        v_user_id,
        NULL
    );

    RETURN p_idea_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.delete_draft(p_idea_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_current_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT i.status
    INTO v_current_status
    FROM public.ideas i
    JOIN public.idea_private_details pd ON pd.idea_id = i.id
    WHERE i.id = p_idea_id
      AND pd.submitter_id = v_user_id
    FOR UPDATE OF i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found or you are not its author.';
    END IF;

    IF v_current_status <> 'Draft' THEN
        RAISE EXCEPTION 'Only Draft ideas can be deleted.';
    END IF;

    DELETE FROM public.idea_private_details
    WHERE idea_id = p_idea_id
      AND submitter_id = v_user_id;

    DELETE FROM public.ideas
    WHERE id = p_idea_id;

    RETURN p_idea_id;
END;
$function$;


-- ============================================================
-- Part 3: Voting and following functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.vote_for_idea(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_status text;
    v_submitter_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to vote.';
    END IF;

    SELECT i.status, pd.submitter_id
    INTO v_status, v_submitter_id
    FROM public.ideas i
    LEFT JOIN public.idea_private_details pd ON pd.idea_id = i.id
    WHERE i.id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status NOT IN ('Submitted', 'Needs More Info', 'Under Evaluation') THEN
        RAISE EXCEPTION 'Voting is not allowed for this idea status.';
    END IF;

    IF v_submitter_id = v_user_id THEN
        RAISE EXCEPTION 'You cannot vote for your own idea.';
    END IF;

    INSERT INTO public.idea_votes (idea_id, user_id)
    VALUES (p_idea_id, v_user_id);

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already voted for this idea.';
END;
$function$;


CREATE OR REPLACE FUNCTION public.unvote_for_idea(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    DELETE FROM public.idea_votes
    WHERE idea_id = p_idea_id
      AND user_id = auth.uid();
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_idea_vote_summary(p_idea_id uuid)
RETURNS TABLE(vote_count bigint, has_voted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_status text;
    v_submitter_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT i.status, pd.submitter_id
    INTO v_status, v_submitter_id
    FROM public.ideas i
    LEFT JOIN public.idea_private_details pd ON pd.idea_id = i.id
    WHERE i.id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status = 'Draft'
       AND v_submitter_id IS DISTINCT FROM v_user_id
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'You cannot view this idea.';
    END IF;

    RETURN QUERY
    SELECT
        (
            SELECT count(*)
            FROM public.idea_votes v
            WHERE v.idea_id = p_idea_id
        ),
        EXISTS (
            SELECT 1
            FROM public.idea_votes v
            WHERE v.idea_id = p_idea_id
              AND v.user_id = v_user_id
        );
END;
$function$;


CREATE OR REPLACE FUNCTION public.follow_idea(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT status
    INTO v_status
    FROM public.ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status = 'Draft' THEN
        RAISE EXCEPTION 'You cannot follow a draft idea.';
    END IF;

    INSERT INTO public.idea_followers (idea_id, user_id)
    VALUES (p_idea_id, v_user_id)
    ON CONFLICT (idea_id, user_id) DO NOTHING;
END;
$function$;


CREATE OR REPLACE FUNCTION public.unfollow_idea(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    DELETE FROM public.idea_followers
    WHERE idea_id = p_idea_id
      AND user_id = auth.uid();
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_idea_follow_summary(p_idea_id uuid)
RETURNS TABLE(follower_count bigint, is_following boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.ideas
        WHERE id = p_idea_id
    ) THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    RETURN QUERY
    SELECT
        (
            SELECT count(*)
            FROM public.idea_followers f
            WHERE f.idea_id = p_idea_id
        ),
        EXISTS (
            SELECT 1
            FROM public.idea_followers f
            WHERE f.idea_id = p_idea_id
              AND f.user_id = v_user_id
        );
END;
$function$;


-- ============================================================
-- Part 4: Comment functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_idea_comment(
    p_idea_id uuid,
    p_content text,
    p_parent_comment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_comment_id uuid;
    v_status text;
    v_parent_idea_id uuid;
    v_parent_parent_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in to comment.';
    END IF;

    IF p_content IS NULL
       OR length(trim(p_content)) = 0
       OR length(trim(p_content)) > 5000 THEN
        RAISE EXCEPTION 'Comment must contain between 1 and 5000 characters.';
    END IF;

    SELECT status
    INTO v_status
    FROM public.ideas
    WHERE id = p_idea_id;

    IF NOT FOUND OR v_status = 'Draft' THEN
        RAISE EXCEPTION 'Comments are not allowed on this idea.';
    END IF;

    IF p_parent_comment_id IS NOT NULL THEN
        SELECT idea_id, parent_comment_id
        INTO v_parent_idea_id, v_parent_parent_id
        FROM public.idea_comments
        WHERE id = p_parent_comment_id;

        IF NOT FOUND OR v_parent_idea_id <> p_idea_id THEN
            RAISE EXCEPTION 'Invalid parent comment.';
        END IF;

        IF v_parent_parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'Replies can only be made to top-level comments.';
        END IF;
    END IF;

    INSERT INTO public.idea_comments (
        idea_id,
        user_id,
        parent_comment_id,
        content
    )
    VALUES (
        p_idea_id,
        v_user_id,
        p_parent_comment_id,
        trim(p_content)
    )
    RETURNING id INTO v_comment_id;

    RETURN v_comment_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.edit_idea_comment(
    p_comment_id uuid,
    p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_updated_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF p_content IS NULL
       OR length(trim(p_content)) = 0
       OR length(trim(p_content)) > 5000 THEN
        RAISE EXCEPTION 'Comment must contain between 1 and 5000 characters.';
    END IF;

    UPDATE public.idea_comments
    SET content = trim(p_content),
        updated_at = now()
    WHERE id = p_comment_id
      AND user_id = v_user_id
      AND created_at >= now() - interval '15 minutes'
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Comment not found or the 15-minute edit period has expired.';
    END IF;

    RETURN v_updated_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.delete_idea_comment(p_comment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_deleted_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    DELETE FROM public.idea_comments
    WHERE id = p_comment_id
      AND user_id = v_user_id
      AND created_at >= now() - interval '15 minutes'
    RETURNING id INTO v_deleted_id;

    IF v_deleted_id IS NULL THEN
        RAISE EXCEPTION 'Comment not found or the 15-minute delete period has expired.';
    END IF;

    RETURN v_deleted_id;
END;
$function$;


-- ============================================================
-- Part 5: Admin evaluation
-- ============================================================

CREATE OR REPLACE FUNCTION public.evaluate_idea(
    p_idea_id uuid,
    p_impact_score integer,
    p_effort_score integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_status text;
    v_quadrant text;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can evaluate ideas.';
    END IF;

    IF p_impact_score NOT BETWEEN 1 AND 5
       OR p_effort_score NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'Impact and effort scores must be between 1 and 5.';
    END IF;

    SELECT status
    INTO v_status
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status NOT IN ('Submitted', 'Under Evaluation') THEN
        RAISE EXCEPTION 'This idea cannot be evaluated in its current status.';
    END IF;

    IF p_impact_score >= 3 AND p_effort_score < 3 THEN
        v_quadrant := 'Quick Win';
    ELSIF p_impact_score >= 3 AND p_effort_score >= 3 THEN
        v_quadrant := 'Big Bet';
    ELSIF p_impact_score < 3 AND p_effort_score < 3 THEN
        v_quadrant := 'Fill-in';
    ELSE
        v_quadrant := 'Not Worth It';
    END IF;

    UPDATE public.ideas
    SET impact_score = p_impact_score,
        effort_score = p_effort_score,
        updated_at = now()
    WHERE id = p_idea_id;

    RETURN v_quadrant;
END;
$function$;


-- ============================================================
-- Part 6: Status transitions
-- ============================================================

CREATE OR REPLACE FUNCTION public.transition_idea(
    p_idea_id uuid,
    p_new_status text,
    p_reason text DEFAULT NULL,
    p_owner_id uuid DEFAULT NULL,
    p_target_date date DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_is_admin boolean;
    v_old_status text;
    v_submitter_id uuid;
    v_old_owner_id uuid;
    v_new_owner_id uuid;
    v_old_target_date date;
    v_new_target_date date;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    v_is_admin := public.is_admin();

    SELECT
        i.status,
        pd.submitter_id,
        i.owner_id,
        i.target_date
    INTO
        v_old_status,
        v_submitter_id,
        v_old_owner_id,
        v_old_target_date
    FROM public.ideas i
    LEFT JOIN public.idea_private_details pd
        ON pd.idea_id = i.id
    WHERE i.id = p_idea_id
    FOR UPDATE OF i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF p_new_status NOT IN (
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
    ) THEN
        RAISE EXCEPTION 'Invalid target status.';
    END IF;

    IF p_new_status = v_old_status THEN
        RAISE EXCEPTION 'The idea is already in this status.';
    END IF;

    IF p_new_status IN ('Needs More Info', 'Rejected', 'Parked')
       AND (
           p_reason IS NULL
           OR length(trim(p_reason)) = 0
       ) THEN
        RAISE EXCEPTION 'A reason is required for this status change.';
    END IF;

    IF v_user_id = v_submitter_id AND NOT v_is_admin THEN
        IF NOT (
            (v_old_status = 'Submitted'
                AND p_new_status = 'Withdrawn')
            OR
            (v_old_status = 'Needs More Info'
                AND p_new_status IN ('Submitted', 'Withdrawn'))
        ) THEN
            RAISE EXCEPTION 'You are not allowed to make this status transition.';
        END IF;

    ELSIF v_is_admin THEN
        IF NOT (
            (v_old_status = 'Submitted'
                AND p_new_status IN (
                    'Under Evaluation',
                    'Needs More Info',
                    'Rejected'
                ))
            OR
            (v_old_status = 'Under Evaluation'
                AND p_new_status IN (
                    'Approved',
                    'Rejected',
                    'Parked',
                    'Needs More Info'
                ))
            OR
            (v_old_status = 'Parked'
                AND p_new_status = 'Under Evaluation')
            OR
            (v_old_status = 'Approved'
                AND p_new_status = 'In Progress')
            OR
            (v_old_status = 'In Progress'
                AND p_new_status IN ('Done', 'Parked'))
        ) THEN
            RAISE EXCEPTION 'Invalid administrator status transition.';
        END IF;

    ELSIF v_user_id = v_old_owner_id THEN
        IF NOT (
            (v_old_status = 'Approved'
                AND p_new_status = 'In Progress')
            OR
            (v_old_status = 'In Progress'
                AND p_new_status IN ('Done', 'Parked'))
        ) THEN
            RAISE EXCEPTION 'You are not allowed to make this status transition.';
        END IF;

    ELSE
        RAISE EXCEPTION 'You are not authorized to change this idea status.';
    END IF;

    IF p_new_status = 'Approved' THEN
        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Only administrators can approve ideas.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.ideas
            WHERE id = p_idea_id
              AND impact_score IS NOT NULL
              AND effort_score IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Complete the impact and effort evaluation before approval.';
        END IF;
    END IF;

    v_new_owner_id := v_old_owner_id;
    v_new_target_date := v_old_target_date;

    IF v_old_status = 'Approved'
       AND p_new_status = 'In Progress' THEN

        IF v_is_admin THEN
            v_new_owner_id := COALESCE(p_owner_id, v_old_owner_id);
            v_new_target_date := COALESCE(p_target_date, v_old_target_date);
        ELSE
            IF p_owner_id IS NOT NULL OR p_target_date IS NOT NULL THEN
                RAISE EXCEPTION 'Only administrators can assign an owner or target date.';
            END IF;
        END IF;

        IF v_new_owner_id IS NULL OR v_new_target_date IS NULL THEN
            RAISE EXCEPTION 'An owner and target date are required to start work.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = v_new_owner_id
              AND role IN ('member', 'admin')
        ) THEN
            RAISE EXCEPTION 'The selected owner does not exist.';
        END IF;
    END IF;

    IF v_old_status = 'In Progress'
       AND p_new_status = 'Done' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.ideas
            WHERE id = p_idea_id
              AND (
                  demo_video_path IS NOT NULL
                  OR demo_video_url IS NOT NULL
              )
        ) THEN
            RAISE EXCEPTION 'A demo video or approved external demo link is required.';
        END IF;
    END IF;

    UPDATE public.ideas
    SET status = p_new_status,
        owner_id = v_new_owner_id,
        target_date = v_new_target_date,
        submitted_at = CASE
            WHEN v_old_status = 'Needs More Info'
                 AND p_new_status = 'Submitted'
            THEN now()
            ELSE submitted_at
        END,
        updated_at = now()
    WHERE id = p_idea_id;

    IF v_new_owner_id IS NOT NULL
       AND v_new_owner_id IS DISTINCT FROM v_old_owner_id THEN
        INSERT INTO public.idea_owner_history (
            idea_id,
            owner_id,
            assigned_by
        )
        VALUES (
            p_idea_id,
            v_new_owner_id,
            v_user_id
        );
    END IF;

    INSERT INTO public.idea_status_history (
        idea_id,
        from_status,
        to_status,
        changed_by,
        reason
    )
    VALUES (
        p_idea_id,
        v_old_status,
        p_new_status,
        v_user_id,
        NULLIF(trim(p_reason), '')
    );

    RETURN p_new_status;
END;
$function$;
-- ============================================================
-- Part 7: Reassign idea owner
-- ============================================================

CREATE OR REPLACE FUNCTION public.reassign_idea_owner(
    p_idea_id uuid,
    p_new_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_old_owner_id uuid;
    v_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can reassign an idea.';
    END IF;

    SELECT owner_id, status
    INTO v_old_owner_id, v_status
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status NOT IN ('Approved', 'In Progress', 'Parked') THEN
        RAISE EXCEPTION 'The owner can only be changed for approved, in-progress, or parked ideas.';
    END IF;

    IF p_new_owner_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles
           WHERE id = p_new_owner_id
             AND role IN ('member', 'admin')
       ) THEN
        RAISE EXCEPTION 'The selected owner does not exist.';
    END IF;

    IF p_new_owner_id IS NOT DISTINCT FROM v_old_owner_id THEN
        RAISE EXCEPTION 'This person is already assigned to the idea.';
    END IF;

    UPDATE public.ideas
    SET owner_id = p_new_owner_id,
        updated_at = now()
    WHERE id = p_idea_id;

    IF p_new_owner_id IS NOT NULL THEN
        INSERT INTO public.idea_owner_history (
            idea_id,
            owner_id,
            assigned_by
        )
        VALUES (
            p_idea_id,
            p_new_owner_id,
            v_user_id
        );
    END IF;
END;
$function$;


-- ============================================================
-- Part 8: Progress updates
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_idea_progress_update(
    p_idea_id uuid,
    p_update_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_owner_id uuid;
    v_status text;
    v_update_id uuid;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    IF p_update_text IS NULL
       OR length(trim(p_update_text)) = 0
       OR length(trim(p_update_text)) > 2000 THEN
        RAISE EXCEPTION 'Progress update must contain between 1 and 2000 characters.';
    END IF;

    SELECT owner_id, status
    INTO v_owner_id, v_status
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status <> 'In Progress' THEN
        RAISE EXCEPTION 'Progress updates are only allowed for ideas In Progress.';
    END IF;

    IF v_user_id <> v_owner_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only the assigned owner or an administrator can add progress updates.';
    END IF;

    INSERT INTO public.idea_progress_updates (
        idea_id,
        user_id,
        update_text
    )
    VALUES (
        p_idea_id,
        v_user_id,
        trim(p_update_text)
    )
    RETURNING id INTO v_update_id;

    RETURN v_update_id;
END;
$function$;


-- ============================================================
-- Part 9: Demo video and outcome saving
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_idea_demo(
    p_idea_id uuid,
    p_demo_video_path text DEFAULT NULL,
    p_demo_video_url text DEFAULT NULL,
    p_outcome_summary text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_owner_id uuid;
    v_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT owner_id, status
    INTO v_owner_id, v_status
    FROM public.ideas
    WHERE id = p_idea_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status <> 'In Progress' THEN
        RAISE EXCEPTION 'Demo details can only be saved while an idea is In Progress.';
    END IF;

    IF v_user_id <> v_owner_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only the assigned owner or an administrator can save demo details.';
    END IF;

    IF p_demo_video_path IS NOT NULL
       AND p_demo_video_url IS NOT NULL THEN
        RAISE EXCEPTION 'Provide either a storage path or an external URL, not both.';
    END IF;

    IF p_demo_video_path IS NOT NULL
       AND split_part(p_demo_video_path, '/', 1) <> p_idea_id::text THEN
        RAISE EXCEPTION 'The demo video must be stored in the idea-specific folder.';
    END IF;

    IF p_demo_video_url IS NOT NULL
       AND p_demo_video_url !~* '^https://(www\.)?(youtube\.com|youtu\.be|loom\.com|drive\.google\.com|docs\.google\.com)/' THEN
        RAISE EXCEPTION 'Use a supported HTTPS YouTube, Loom, or Google Drive link.';
    END IF;

    IF p_outcome_summary IS NOT NULL
       AND length(p_outcome_summary) > 5000 THEN
        RAISE EXCEPTION 'Outcome summary cannot exceed 5000 characters.';
    END IF;

    UPDATE public.ideas
    SET demo_video_path = p_demo_video_path,
        demo_video_url = p_demo_video_url,
        outcome_summary = NULLIF(trim(p_outcome_summary), ''),
        updated_at = now()
    WHERE id = p_idea_id;
END;
$function$;


-- ============================================================
-- Part 10: Profile names and anonymous submitter privacy
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profile_names(
    p_user_ids uuid[]
)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    RETURN QUERY
    SELECT p.id, p.full_name
    FROM public.profiles p
    WHERE p.id = ANY(p_user_ids)
      AND EXISTS (
          SELECT 1
          FROM public.ideas i
          WHERE i.owner_id = p.id
            AND i.status NOT IN ('Draft', 'Withdrawn')
      );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_idea_submitter_name(
    p_idea_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid;
    v_submitter_id uuid;
    v_is_anonymous boolean;
    v_status text;
    v_full_name text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be logged in.';
    END IF;

    SELECT i.status, pd.submitter_id, i.is_anonymous
    INTO v_status, v_submitter_id, v_is_anonymous
    FROM public.ideas i
    LEFT JOIN public.idea_private_details pd
        ON pd.idea_id = i.id
    WHERE i.id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found.';
    END IF;

    IF v_status = 'Draft'
       AND v_user_id IS DISTINCT FROM v_submitter_id
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'You cannot view this idea.';
    END IF;

    IF v_is_anonymous AND NOT public.is_admin() THEN
        RETURN NULL;
    END IF;

    SELECT full_name
    INTO v_full_name
    FROM public.profiles
    WHERE id = v_submitter_id;

    RETURN v_full_name;
END;
$function$;


-- ============================================================
-- Part 11: Application table RLS policies
-- ============================================================

-- Ideas
DROP POLICY IF EXISTS "Members can view submitted ideas and own drafts"
ON public.ideas;

CREATE POLICY "Members can view submitted ideas and own drafts"
ON public.ideas
FOR SELECT
TO authenticated
USING (
    status <> 'Draft'
    OR public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.idea_private_details pd
        WHERE pd.idea_id = ideas.id
          AND pd.submitter_id = (SELECT auth.uid())
    )
);


-- Profiles
DROP POLICY IF EXISTS "Users can view own profile or admins can view all"
ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR public.is_admin()
);


DROP POLICY IF EXISTS "Users can update own profile"
ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = (SELECT auth.uid())
)
WITH CHECK (
    id = (SELECT auth.uid())
);


-- Private idea details
DROP POLICY IF EXISTS "Authors and admins can view private idea details"
ON public.idea_private_details;

CREATE POLICY "Authors and admins can view private idea details"
ON public.idea_private_details
FOR SELECT
TO authenticated
USING (
    submitter_id = (SELECT auth.uid())
    OR public.is_admin()
);


-- Followers
DROP POLICY IF EXISTS "Users can view their own follows"
ON public.idea_followers;

CREATE POLICY "Users can view their own follows"
ON public.idea_followers
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);


-- Comments
DROP POLICY IF EXISTS "Members can read comments on visible ideas"
ON public.idea_comments;

CREATE POLICY "Members can read comments on visible ideas"
ON public.idea_comments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id = idea_comments.idea_id
          AND i.status <> 'Draft'
    )
);


-- Progress updates
DROP POLICY IF EXISTS "Members can read progress updates on visible ideas"
ON public.idea_progress_updates;

CREATE POLICY "Members can read progress updates on visible ideas"
ON public.idea_progress_updates
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id = idea_progress_updates.idea_id
          AND i.status <> 'Draft'
    )
);


-- Status history
DROP POLICY IF EXISTS "Users can view history of visible ideas"
ON public.idea_status_history;

CREATE POLICY "Users can view history of visible ideas"
ON public.idea_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id = idea_status_history.idea_id
          AND (
              i.status <> 'Draft'
              OR public.is_admin()
              OR EXISTS (
                  SELECT 1
                  FROM public.idea_private_details pd
                  WHERE pd.idea_id = i.id
                    AND pd.submitter_id = (SELECT auth.uid())
              )
          )
    )
);


-- Owner assignment history
DROP POLICY IF EXISTS "Users can view owner history of visible ideas"
ON public.idea_owner_history;

CREATE POLICY "Users can view owner history of visible ideas"
ON public.idea_owner_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id = idea_owner_history.idea_id
          AND i.status <> 'Draft'
    )
);


-- ============================================================
-- Part 12: Private Storage bucket and policies
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'idea-demos',
    'idea-demos',
    false,
    104857600,
    ARRAY[
        'video/mp4',
        'video/quicktime',
        'video/webm'
    ]
)
ON CONFLICT (id)
DO UPDATE SET
    public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
        'video/mp4',
        'video/quicktime',
        'video/webm'
    ];


DROP POLICY IF EXISTS "Owners and admins can upload idea demos"
ON storage.objects;

CREATE POLICY "Owners and admins can upload idea demos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'idea-demos'
    AND EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id::text = (storage.foldername(objects.name))[1]
          AND i.status = 'In Progress'
          AND (
              i.owner_id = (SELECT auth.uid())
              OR public.is_admin()
          )
    )
);


DROP POLICY IF EXISTS "Users can view demos of visible ideas"
ON storage.objects;

CREATE POLICY "Users can view demos of visible ideas"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'idea-demos'
    AND EXISTS (
        SELECT 1
        FROM public.ideas i
        WHERE i.id::text = (storage.foldername(objects.name))[1]
          AND i.status NOT IN ('Draft', 'Withdrawn')
    )
);


-- ============================================================
-- Part 13: Function permissions
-- ============================================================

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;


REVOKE ALL ON FUNCTION public.create_idea(
    text, text, text, text, text, text, text, text[], boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_idea(
    text, text, text, text, text, text, text, text[], boolean
) TO authenticated;


REVOKE ALL ON FUNCTION public.update_idea(
    uuid, text, text, text, text, text, text, text, text[], boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_idea(
    uuid, text, text, text, text, text, text, text, text[], boolean
) TO authenticated;


REVOKE ALL ON FUNCTION public.submit_idea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_idea(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.delete_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_draft(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.vote_for_idea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_for_idea(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.unvote_for_idea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unvote_for_idea(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.get_idea_vote_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_idea_vote_summary(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.follow_idea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.follow_idea(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.unfollow_idea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unfollow_idea(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.get_idea_follow_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_idea_follow_summary(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.add_idea_comment(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_idea_comment(uuid, text, uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.edit_idea_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_idea_comment(uuid, text) TO authenticated;


REVOKE ALL ON FUNCTION public.delete_idea_comment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_idea_comment(uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.evaluate_idea(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_idea(uuid, integer, integer) TO authenticated;


REVOKE ALL ON FUNCTION public.transition_idea(
    uuid, text, text, uuid, date
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.transition_idea(
    uuid, text, text, uuid, date
) TO authenticated;


REVOKE ALL ON FUNCTION public.reassign_idea_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_idea_owner(uuid, uuid) TO authenticated;


REVOKE ALL ON FUNCTION public.add_idea_progress_update(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_idea_progress_update(uuid, text) TO authenticated;


REVOKE ALL ON FUNCTION public.save_idea_demo(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_idea_demo(uuid, text, text, text) TO authenticated;


REVOKE ALL ON FUNCTION public.get_profile_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;


REVOKE ALL ON FUNCTION public.get_idea_submitter_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_idea_submitter_name(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_idea_submitter_name(uuid) TO authenticated;


-- End of CloseFuture functions, policies and storage migration