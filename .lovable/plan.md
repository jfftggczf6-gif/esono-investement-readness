

# Fix : Volumes trimestriels Q3/Q4 toujours à zéro dans l'Excel OVO

## Problème identifié

Le template Excel OVO attend **4 trimestres** (colonnes AE=Q1, AF=Q2, AG=Q3, AH=Q4). Le code actuel :

1. **`ovo-data-expander.ts`** : génère uniquement `volume_h1` (45% du total) et `volume_h2` (55% du total), avec `volume_q3: 0` et `volume_q4: 0` en dur
2. **`generate-ovo-plan/index.ts`** : écrit `volume_h1` → AE (Q1), `volume_h2` → AF (Q2), `volume_q3` → AG (Q3=0), `volume_q4` → AH (Q4=0)

Résultat : le template ne calcule le revenu que sur Q1+Q2, les Q3/Q4 sont toujours vides. Le CA affiché est donc incomplet.

## Correction

### Fichier 1 : `supabase/functions/_shared/ovo-data-expander.ts`

Remplacer la logique de split H1/H2 par un split en 4 trimestres partout :

- `expandProductOrService()` : au lieu de `volume_h1 = total * 0.45` et `volume_h2 = total * 0.55`, générer :
  - `volume_q1 = Math.round(total * 0.22)`
  - `volume_q2 = Math.round(total * 0.25)`
  - `volume_q3 = Math.round(total * 0.27)`
  - `volume_q4 = total - q1 - q2 - q3` (le reste, ~26%, pour éviter les erreurs d'arrondi)
- Même correction dans `repairPerYearVolumes()` et l'extrapolation partielle
- Les produits inactifs gardent les 4 trimestres à 0

### Fichier 2 : `supabase/functions/generate-ovo-plan/index.ts`

Mettre à jour l'écriture des volumes :
- AE = `volume_q1` (au lieu de `volume_h1`)
- AF = `volume_q2` (au lieu de `volume_h2`)
- AG = `volume_q3`
- AH = `volume_q4`

Aussi mettre à jour `scaleToFrameworkTargets` dans le data expander pour utiliser les 4 trimestres au lieu de h1+h2.

### Fichier 3 : Prompt AI dans `generate-ovo-plan/index.ts`

Le schéma JSON demandé à l'IA utilise `volume_cy` qui est ensuite réparti. Le prompt mentionne déjà `volume_q3`/`volume_q4` comme champs — pas de changement nécessaire au prompt, c'est l'expansion qui fait le split.

## Impact

- Les 4 trimestres seront remplis dans l'Excel
- Le total annuel (calculé par la formule Excel Q1+Q2+Q3+Q4) sera correct
- Le CA total correspondra aux projections du Framework

