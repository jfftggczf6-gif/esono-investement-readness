

## Pourquoi les nouveaux livrables ne sont pas generés

Il y a **3 problèmes de build** qui empêchent le déploiement :

### Problème 1 : `npm:docx@8` dans `generate-business-plan`
L'import `npm:docx@8` n'est pas supporté par l'edge runtime. Il faut le remplacer par un import `esm.sh`.

**Fichier** : `supabase/functions/generate-business-plan/index.ts` ligne 4
- Remplacer : `from "npm:docx@8"`
- Par : `from "https://esm.sh/docx@8.5.0"`

### Problème 2 : Doublons dans `types.ts` (auto-généré)
Le fichier `types.ts` contient des propriétés dupliquées (`gap_score_*`, `readiness_pathway`) dans le bloc `Update` de `enterprises`. Ce fichier est auto-généré — les doublons viennent probablement d'une migration qui a ré-ajouté des colonnes déjà présentes. Il faut supprimer les lignes 396-401 (les doublons en fin de bloc `Update`).

**Fichier** : `src/integrations/supabase/types.ts` lignes 396-401 — supprimer ces 6 lignes dupliquées.

### Problème 3 : `pitch_html` sans cast `as any`
Même problème que précédemment corrigé pour `onepager_html`.

**Fichier** : `src/components/dashboard/EntrepreneurDashboard.tsx` lignes 1415 et 1418
- Remplacer `selectedDeliv.data?.pitch_html` par `(selectedDeliv.data as any)?.pitch_html`
- Remplacer `selectedDeliv.data.pitch_html` par `(selectedDeliv.data as any).pitch_html`

### Problème 4 : Imports inutilisés (warnings bloquants)
- `CoachDashboard.tsx` ligne 24 : retirer `Presentation` et `Wand2`
- `DataRoomManager.tsx` ligne 7 : retirer `FolderOpen` ; ligne 65 : préfixer `_enterpriseName` ; ligne 160 : préfixer `_data`
- `InputsWizard.tsx` ligne 182 : préfixer `_enterpriseId`
- `ReconstructionUploader.tsx` ligne 6 : retirer `Upload`

### Résumé
Une fois ces 4 corrections appliquées, le build passera et les edge functions `generate-gap-analysis`, `generate-investment-memo` et `generate-pitch-deck` pourront s'exécuter dans le pipeline.

