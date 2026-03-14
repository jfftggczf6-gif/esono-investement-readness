-- Add new deliverable types for the investor-facing pipeline
ALTER TYPE public.deliverable_type ADD VALUE IF NOT EXISTS 'gap_analysis';
ALTER TYPE public.deliverable_type ADD VALUE IF NOT EXISTS 'investment_memo';
ALTER TYPE public.deliverable_type ADD VALUE IF NOT EXISTS 'onepager';

-- Add new module codes so enterprise_modules can track progress
ALTER TYPE public.module_code ADD VALUE IF NOT EXISTS 'gap_analysis';
ALTER TYPE public.module_code ADD VALUE IF NOT EXISTS 'investment_memo';

-- Denormalized gap analysis scores on enterprises for fast display without JOIN
ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS readiness_pathway TEXT,
  ADD COLUMN IF NOT EXISTS gap_score_corporate INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_score_finance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_score_commercial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_score_legal INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_score_esg INTEGER DEFAULT 0;
