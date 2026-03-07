

# Plan : Corriger les revenus manquants 2028-2031 et assurer la cohérence avec le Plan Financier Intermédiaire

## Diagnostic

Il y a **deux fonctions séparées** qui génèrent les données financières du Plan OVO :

1. **`generate-plan-ovo`** (preview HTML) — génère `revenue`, `ebitda`, etc. par année via l'IA, stocké comme deliverable `plan_ovo`
2. **`generate-ovo-plan`** (Excel) — utilise le schéma condensé + expansion programmatique

**Problème racine identifié** : La fonction `generate-plan-ovo` **hardcode les années 2022-2029** (base_year=2024) dans son prompt (lignes 44-53). Comme on est en 2026, les années devraient être 2024-2031. Résultat :
- Les données stockées montrent `current_year: 2024` au lieu de 2026
- Les années 2028-2029 sont `year5`/`year6` (les dernières) au lieu d'être `year3`/`year4`
- Les années 2030-2031 **n'existent pas du tout** dans le schéma

De plus, il n'y a **aucune cohérence** entre les deux fonctions — elles font des appels IA indépendants avec des prompts différents.

**Données actuelles en base** :
- `plan_ovo.years`: current_year=2024 (devrait être 2026)
- `plan_ovo.revenue`: a des valeurs pour year5(2028) et year6(2029), mais pas pour 2030-2031
- `framework_data.projection_5ans`: a des projections an1-an5 avec CA allant de 145M à 285M

## Solution

### 1. Corriger `generate-plan-ovo` pour utiliser l'année courante dynamique

**Fichier** : `supabase/functions/generate-plan-ovo/index.ts`

- Remplacer les années hardcodées (2022-2029) dans le prompt par des valeurs dynamiques basées sur `new Date().getFullYear()`
- Le schema JSON exemple dans `userPrompt` utilisera `cy-2` à `cy+5` au lieu de 2022-2029

### 2. Injecter les projections du Framework comme contraintes dans le prompt `generate-plan-ovo`

**Fichier** : `supabase/functions/generate-plan-ovo/index.ts`

Le `allData` contient déjà `framework`, mais le prompt ne l'exploite pas de manière structurée. Ajouter :
- Extraction des `projection_5ans.lignes` du framework (CA, Marge Brute, EBITDA, Résultat Net, Cash-Flow)
- Injection comme contraintes explicites : "Le revenue year2 DOIT être ~145M, year3 ~180M..."
- Cela garantit la cohérence entre le Plan Financier Intermédiaire et le Plan Financier Final

### 3. Passer les données framework/inputs dans le contexte de `generate-plan-ovo`

**Fichier** : `supabase/functions/generate-plan-ovo/index.ts`

Le `verifyAndGetContext` récupère déjà les deliverables (`deliverableMap`). L'objet `allData` inclut framework et inputs. Le prompt doit :
- Extraire le CA historique depuis `inputs_data.compte_resultat`
- Extraire les projections 5 ans depuis `framework_data.projection_5ans`
- Les utiliser comme guardrails numériques (pas juste du contexte textuel)

### 4. (Optionnel) Ajouter un normalizer pour `plan_ovo`

**Fichier** : `supabase/functions/_shared/normalizers.ts`

Ajouter `normalizePlanOvo` pour :
- S'assurer que toutes les clés `year_minus_2` à `year6` existent dans `revenue`, `cogs`, `ebitda`, etc.
- Remplir les valeurs manquantes par interpolation si le JSON est tronqué
- Valider la cohérence (gross_profit = revenue - cogs)

## Fichiers modifiés

1. `supabase/functions/generate-plan-ovo/index.ts` — prompt dynamique + contraintes framework
2. `supabase/functions/_shared/normalizers.ts` — normalizer plan_ovo

## Impact

- Les années affichées seront correctes (2024-2031 avec base 2026)
- Les revenus projetés seront cohérents avec le Plan Financier Intermédiaire
- Après régénération du module Plan OVO, le PlanOvoViewer affichera les données complètes sur 8 ans

