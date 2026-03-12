

## Plan : Supprimer les livrables et corriger les erreurs de build

### 1. Supprimer les 11 livrables de PRESTIGE TRAITEUR ABIDJAN SARL

Exécuter un `DELETE` sur la table `deliverables` pour `enterprise_id = '38667b5a-bde4-4e86-bbe0-43692b04eb56'`. Les 11 livrables suivants seront supprimés :
- bmc_analysis (v6), bmc_html (v1), sic_analysis (v9), inputs_data (v6), framework_data (v6), diagnostic_data (v7), plan_ovo (v4), business_plan (v7), odd_analysis (v4), plan_ovo_excel (v1), odd_excel (v1)

Remettre aussi le `score_ir` de l'entreprise à 0.

### 2. Corriger les erreurs de build

**`supabase/functions/_shared/odd-excel-template.ts`** : Changer `import JSZip from "npm:jszip@3"` en `import JSZip from "https://esm.sh/jszip@3.10.1"` (compatible Deno edge functions).

**`src/components/dashboard/PlanOvoViewer.tsx`** : Préfixer les 4 variables inutilisées (`rawTri`, `rawCagrRev`, `rawCagrEbitda`, `rawRoi`) avec `_` pour supprimer les erreurs TS6133.

### Fichiers modifiés
- `supabase/functions/_shared/odd-excel-template.ts` (ligne 1)
- `src/components/dashboard/PlanOvoViewer.tsx` (lignes 160-163)

