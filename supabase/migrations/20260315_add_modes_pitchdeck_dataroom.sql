-- Phase 2: Operating Modes + Pitch Deck + Data Room + Activity Log
-- Run after: 20260314_add_investment_deliverables.sql

-- ─────────────────────────────────────────────
-- 1. Operating mode enum + enterprise columns
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.operating_mode AS ENUM ('assisted', 'reconstruction', 'due_diligence');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS operating_mode public.operating_mode DEFAULT 'assisted',
  ADD COLUMN IF NOT EXISTS data_room_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_room_slug TEXT;

-- Unique index on slug (sparse: NULL values not indexed)
CREATE UNIQUE INDEX IF NOT EXISTS enterprises_data_room_slug_idx
  ON public.enterprises (data_room_slug)
  WHERE data_room_slug IS NOT NULL;

-- ─────────────────────────────────────────────
-- 2. New deliverable + module types
-- ─────────────────────────────────────────────
ALTER TYPE public.deliverable_type ADD VALUE IF NOT EXISTS 'pitch_deck';
ALTER TYPE public.module_code ADD VALUE IF NOT EXISTS 'pitch_deck';
ALTER TYPE public.module_code ADD VALUE IF NOT EXISTS 'data_room';

-- ─────────────────────────────────────────────
-- 3. Data Room documents table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_room_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id     UUID        NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  category          TEXT        NOT NULL CHECK (category IN ('legal','finance','commercial','team','impact','other')),
  label             TEXT        NOT NULL,
  filename          TEXT        NOT NULL,
  storage_path      TEXT        NOT NULL,
  file_size         INTEGER,
  evidence_level    INTEGER     DEFAULT 0 CHECK (evidence_level BETWEEN 0 AND 3),
  is_generated      BOOLEAN     DEFAULT false,
  deliverable_type  TEXT,
  uploaded_by       UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_room_docs_enterprise_idx ON public.data_room_documents (enterprise_id);
CREATE INDEX IF NOT EXISTS data_room_docs_category_idx  ON public.data_room_documents (enterprise_id, category);

-- ─────────────────────────────────────────────
-- 4. Data Room investor share tokens
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_room_shares (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id   UUID        NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  investor_email  TEXT,
  investor_name   TEXT,
  -- Token sent via email, entered in form (never in URL)
  access_token    TEXT        UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ,
  can_download    BOOLEAN     DEFAULT true,
  viewed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_room_shares_enterprise_idx ON public.data_room_shares (enterprise_id);
CREATE INDEX IF NOT EXISTS data_room_shares_token_idx      ON public.data_room_shares (access_token);

-- ─────────────────────────────────────────────
-- 5. Activity log / audit trail
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id    UUID        NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  actor_id         UUID        REFERENCES auth.users(id),
  actor_role       TEXT        CHECK (actor_role IN ('entrepreneur','coach','system')),
  action           TEXT        NOT NULL,
  -- e.g. 'generate', 'upload', 'share', 'download', 'mode_change', 'reconstruction'
  resource_type    TEXT,
  -- e.g. 'deliverable', 'document', 'data_room_share'
  resource_id      UUID,
  deliverable_type TEXT,
  -- Deliverable type if relevant
  metadata         JSONB       DEFAULT '{}',
  -- Extra context (score, version, filename, etc.)
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_enterprise_idx ON public.activity_log (enterprise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_actor_idx      ON public.activity_log (actor_id);

-- ─────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE public.data_room_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_shares     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log         ENABLE ROW LEVEL SECURITY;

-- Entrepreneurs + coaches see their own enterprise data
CREATE POLICY "data_room_docs_owner" ON public.data_room_documents
  FOR ALL USING (
    enterprise_id IN (
      SELECT id FROM public.enterprises
      WHERE user_id = auth.uid() OR coach_id = auth.uid()
    )
  );

CREATE POLICY "data_room_shares_owner" ON public.data_room_shares
  FOR ALL USING (
    enterprise_id IN (
      SELECT id FROM public.enterprises
      WHERE user_id = auth.uid() OR coach_id = auth.uid()
    )
  );

CREATE POLICY "activity_log_owner" ON public.activity_log
  FOR SELECT USING (
    enterprise_id IN (
      SELECT id FROM public.enterprises
      WHERE user_id = auth.uid() OR coach_id = auth.uid()
    )
  );

-- System/edge functions write activity log (service role bypasses RLS)
CREATE POLICY "activity_log_insert_authenticated" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
