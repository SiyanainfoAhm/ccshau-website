-- Page-only deletion workflow. Other content keeps ccshau_content_status.
DO $$ BEGIN
  CREATE TYPE public.ccshau_page_status AS ENUM
    ('draft', 'pending_review', 'published', 'archived', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Preserve the existing RLS policies while changing the column's enum type.
DO $$
DECLARE
  policies jsonb;
  policy jsonb;
  role_list text;
  definition text;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO policies
  FROM pg_policies p
  JOIN pg_namespace n ON n.nspname = p.schemaname
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = p.tablename
  JOIN pg_policy pol ON pol.polrelid = c.oid AND pol.polname = p.policyname
  WHERE (p.schemaname = 'public' AND p.tablename = 'ccshau_pages') OR EXISTS (
    SELECT 1 FROM pg_depend d
    WHERE d.classid = 'pg_policy'::regclass AND d.objid = pol.oid
      AND d.refobjid = 'public.ccshau_pages'::regclass
      AND d.refobjsubid = (SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.ccshau_pages'::regclass AND attname = 'status')
  );
  FOR policy IN SELECT value FROM jsonb_array_elements(policies) LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy->>'policyname',
      policy->>'schemaname', policy->>'tablename');
  END LOOP;

  ALTER TABLE public.ccshau_pages ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.ccshau_pages ALTER COLUMN status TYPE public.ccshau_page_status
    USING status::text::public.ccshau_page_status;
  ALTER TABLE public.ccshau_pages ALTER COLUMN status SET DEFAULT 'draft';

  FOR policy IN SELECT value FROM jsonb_array_elements(policies) LOOP
    SELECT string_agg(quote_ident(value), ', ') INTO role_list
      FROM jsonb_array_elements_text(policy->'roles');
    definition := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      policy->>'policyname', policy->>'schemaname', policy->>'tablename',
      policy->>'permissive', policy->>'cmd', role_list);
    IF policy->>'qual' IS NOT NULL THEN
      definition := definition || ' USING (' ||
        replace(policy->>'qual', 'ccshau_content_status', 'ccshau_page_status') || ')';
    END IF;
    IF policy->>'with_check' IS NOT NULL THEN
      definition := definition || ' WITH CHECK (' ||
        replace(policy->>'with_check', 'ccshau_content_status', 'ccshau_page_status') || ')';
    END IF;
    EXECUTE definition;
  END LOOP;
END $$;

-- Preserve legacy deletions before removing their flag (also works if absent).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ccshau_pages' AND column_name = 'is_deleted') THEN
    EXECUTE 'UPDATE public.ccshau_pages SET status = ''deleted'' WHERE is_deleted = true';
  END IF;
END $$;

DROP INDEX IF EXISTS public.ccshau_idx_pages_not_deleted;
DROP INDEX IF EXISTS public.ccshau_pages_slug_active_key;
ALTER TABLE public.ccshau_pages DROP CONSTRAINT IF EXISTS ccshau_pages_slug_key;
ALTER TABLE public.ccshau_pages DROP COLUMN IF EXISTS is_deleted;
CREATE UNIQUE INDEX ccshau_pages_slug_active_key ON public.ccshau_pages (slug)
  WHERE status <> 'deleted';
CREATE INDEX ccshau_idx_pages_not_deleted ON public.ccshau_pages (updated_at DESC)
  WHERE status <> 'deleted';
