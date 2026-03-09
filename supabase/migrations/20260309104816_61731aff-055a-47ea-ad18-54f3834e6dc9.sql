
-- Table knowledge_base pour le RAG
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('bailleurs', 'benchmarks', 'fiscal', 'secteurs', 'odd', 'reglementation', 'general')),
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  source text,
  country text,
  sector text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX idx_knowledge_base_country ON public.knowledge_base(country);
CREATE INDEX idx_knowledge_base_sector ON public.knowledge_base(sector);
CREATE INDEX idx_knowledge_base_tags ON public.knowledge_base USING gin(tags);

-- RLS: accessible en lecture par tous les utilisateurs authentifiés
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge_base"
ON public.knowledge_base FOR SELECT TO authenticated
USING (true);

-- Trigger updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
