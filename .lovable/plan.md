

## Plan: 4 corrections ciblées OVO Plan Financier

### Modifications

**Fichier 1: `supabase/functions/generate-ovo-plan/index.ts`**

**1a. Réduire max_tokens + timeout fetch Claude** (ligne ~324-337)
- Ajouter `signal: AbortSignal.timeout(90000)` au fetch
- Changer `max_tokens: 32768` → `max_tokens: 16384`

**1b. wFinance : skip col S par défaut** (lignes 867-874)
- Ajouter `"S"` au Set de colonnes skippées par défaut (S = formule Excel auto-calculée)

**1c. Staff forEach : étendre skip S à salary et allowances** (lignes 1116-1121)
- Déplacer les 3 lignes `w()` (eft, salary, allowances) à l'intérieur du `if (finCols[i] !== "S")`, pour que salary et allowances soient aussi skippés en colonne S

**Fichier 2: `src/components/dashboard/EntrepreneurDashboard.tsx`**

**2a. Polling : URL signée fraîche** (ligne ~278)
- Remplacer l'usage direct de `d.file_url` par un appel `supabase.storage.from('ovo-outputs').createSignedUrl(meta.file_name, 3600)` quand `status === 'completed'`

### Fichiers non touchés
- `applyWritesToXml`, `normalizeRangeData`, `CELL_REGEX`, contraintes volumes prompt — déjà corrigés
- Migrations SQL, RLS — déjà appliquées

### Post-déploiement
- Redéployer la Edge Function `generate-ovo-plan`
- Tester une génération complète

