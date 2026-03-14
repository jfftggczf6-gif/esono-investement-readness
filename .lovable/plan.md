

## Corriger les erreurs de build

Il y a 3 problèmes distincts à résoudre :

### 1. Edge Function `generate-business-plan` — import JSZip incompatible

Le fichier utilise `npm:jszip@3` alors que tous les autres fichiers partagés utilisent `https://esm.sh/jszip@3.10.1`. Il faut aligner l'import.

**Fichier** : `supabase/functions/generate-business-plan/index.ts` ligne 6
- Remplacer : `import JSZip from "npm:jszip@3";`
- Par : `import JSZip from "https://esm.sh/jszip@3.10.1";`

### 2. TypeScript — `onepager_html` sur `selectedDeliv.data`

**Fichier** : `src/components/dashboard/EntrepreneurDashboard.tsx` lignes 1344 et 1347
- Le type `data` est `jsonb` (type `Json`), il faut caster en `any` pour accéder aux propriétés dynamiques.
- Remplacer : `selectedDeliv.data?.onepager_html` par `(selectedDeliv.data as any)?.onepager_html`
- Remplacer : `selectedDeliv.data.onepager_html` par `(selectedDeliv.data as any).onepager_html`

### 3. Imports inutilisés dans `GapAnalysisViewer.tsx`

**Fichier** : `src/components/dashboard/GapAnalysisViewer.tsx` lignes 1, 4, 5
- Retirer `Badge`, `Progress`, et `ExternalLink` des imports.

### 4. Migration SQL

La migration `20260314_add_investment_deliverables.sql` existe déjà dans le dossier mais n'a pas été exécutée sur la base. Je lancerai cette migration via l'outil de migration pour ajouter les enum values et les colonnes manquantes sur `enterprises`.

