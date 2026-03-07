

## Plan: Fix empty Diagnostic HTML report + generation resilience on screen switch

### Issue 1: Empty Diagnostic HTML report

**Root cause**: The `diagnosticHTML()` function in `download-deliverable/index.ts` (line 845-873) only renders **old format** fields (`synthese_executive`, `diagnostic_par_dimension`, `swot`, `verdict`). The new diagnostic format uses `resume_executif`, `scores_dimensions`, `avis_par_livrable`, `benchmarks`, `forces`, `opportunites_amelioration`, `recommandations`, `synthese_globale` — none of which are rendered.

Database confirms: the diagnostic has `score_global: 83` and `has_new_format: true` but `html_content: NULL`.

**Fix**: Rewrite `diagnosticHTML()` in `download-deliverable/index.ts` to render the new format:
- Header with score, palier/label, couleur
- Resume executif
- 5 dimensions (coherence, viabilite, realisme, completude_couts, capacite_remboursement) with progress bars
- Forces + opportunites_amelioration
- Benchmarks table (marge_brute, marge_nette, dscr, etc.)
- Avis par livrable
- Recommandations prioritaires
- Synthese globale + prochaines etapes
- Fallback to old format fields if present (backward compat)

### Issue 2: Generation stops when switching screens

**Root cause**: `handleGenerate()` runs as an async loop inside `EntrepreneurDashboard`. When the user clicks a sidebar link or navigates away, the component unmounts, the async function's state setters become no-ops, and `fetch()` calls may silently fail or be abandoned.

**Fix**: Add an `AbortController` pattern + a UI lock that prevents navigation during generation:
- Show a modal/overlay during generation that blocks sidebar clicks with a message like "Generation en cours, veuillez patienter..."
- Use a `useRef` to track if component is still mounted, skip state updates if unmounted but let fetches complete
- Add a visible warning banner at the top during generation

### Files to modify
1. `supabase/functions/download-deliverable/index.ts` — rewrite `diagnosticHTML()` for new format
2. `src/components/dashboard/EntrepreneurDashboard.tsx` — add generation lock overlay to prevent navigation

