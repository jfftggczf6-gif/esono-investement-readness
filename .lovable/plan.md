

## Audit complet de la partie finance — Erreurs et incohérences identifiées

Après analyse de `normalizers.ts` (957 lignes), `helpers.ts`, `generate-plan-ovo/index.ts`, `generate-framework/index.ts`, `reconcile-plan-ovo/index.ts`, et `PlanOvoViewer.tsx`, voici les **10 bugs** identifiés :

---

### BUGS CRITIQUES (données fausses)

**BUG 1 — EBITDA non recalculé = incohérence principale**
`normalizePlanOvo` (L546-552) recalcule `gross_profit = revenue - cogs`, mais **ne recalcule PAS** `ebitda = gross_profit - total_opex`. L'EBITDA reste la valeur brute de l'IA. Résultat : EBITDA peut être > gross_profit ou < net_profit, ce qui est comptablement impossible.
- **Fix** : Après recalcul de gross_profit, calculer `total_opex` et forcer `ebitda = gross_profit - total_opex`.

**BUG 2 — Aucune validation EBITDA ≥ Net Profit**
Nulle part dans `enforceFrameworkConstraints` ni `normalizePlanOvo` on ne vérifie que `EBITDA ≥ Net Profit`. Si le Framework fournit des valeurs incohérentes, elles se propagent telles quelles.
- **Fix** : Ajouter un garde-fou : si `net_profit > ebitda` pour une année, forcer `net_profit = ebitda * (1 - IS/100)`.

**BUG 3 — CAGR EBITDA halluciné quand EBITDA current_year ≤ 0**
L535 normalizers.ts : le CAGR EBITDA n'est calculé que si `ebCY > 0` (L765), mais si l'IA a mis une valeur CAGR avant cette étape, elle persiste. Le viewer (L167) affiche `ai.cagr_ebitda * 100` sans vérifier que le sous-jacent est valide.
- **Fix** : Si `ebitda.current_year ≤ 0`, forcer `cagr_ebitda = null`. Côté viewer, afficher "N/A".

**BUG 4 — ROI positif malgré des pertes nettes cumulées**
L770-772 : `ROI = totalNet / initialInv`. Si `initialInv` est faible et les net_profit sont légèrement positifs sur certaines années mais négatifs sur d'autres, le ROI peut être trompeur. Aucune validation croisée avec la VAN.
- **Fix** : Si `VAN < 0` et `ROI > 0`, signaler l'incohérence ou recalculer.

**BUG 5 — funding_need = 0 → métriques VAN/TRI/ROI/Payback absurdes**
L731 : `initialInv = data.funding_need || 0`. Si l'IA met 0, la VAN = somme des CF actualisés (pas d'investissement), le TRI et ROI font une division par zéro implicite.
- **Fix** : Si `funding_need = 0` et des CAPEX existent, dériver `funding_need = Σ CAPEX`. Sinon marquer les métriques comme N/A.

---

### BUGS MODÉRÉS (imprécisions)

**BUG 6 — Croissance historique uniforme pour toutes les séries**
L603-631 : Le taux de croissance implicite est calculé à partir de `revenue.year2 / revenue.current_year` et appliqué **identiquement** à toutes les séries (cogs, ebitda, net_profit, cashflow). Les marges historiques sont donc artificiellement constantes.
- **Fix** : Pour chaque série, calculer un taux de croissance spécifique basé sur `series.year2 / series.current_year`.

**BUG 7 — Exponent CAGR prompt IA = 1/6, code = 1/5**
Le prompt dans `generate-plan-ovo` (L23) dit `CAGR = (Y6/Y0)^(1/6)` mais le code `enforceFrameworkConstraints` utilise `1/5` (L759). L'IA peut calculer un CAGR initial faux qui est ensuite partiellement écrasé par le code.
- **Fix** : Corriger le prompt pour utiliser `1/5` (5 ans entre current_year et year6).

**BUG 8 — Viewer : totalInvestment fallback = 1 → métriques gonflées**
`PlanOvoViewer.tsx` L144 : `const totalInvestment = Math.max(fundingNeed, capexTotal) || 1`. Si les deux sont 0, l'investissement est 1 FCFA, ce qui donne un ROI astronomique.
- **Fix** : Si `totalInvestment ≤ 0`, ne pas calculer ROI/TRI/Payback, afficher "N/A".

**BUG 9 — Viewer : double conversion % pour le TRI**
L165 : `tri: ai?.tri != null ? ai.tri * 100 : calcIRR(...)`. Le code serveur stocke le TRI en décimal (0.15 = 15%). Le fallback `calcIRR` retourne déjà en % (L64 : `return rate * 100`). Correct. Mais si l'IA retourne le TRI déjà en % (ex: 15 au lieu de 0.15), on afficherait 1500%.
- **Fix** : Ajouter un garde-fou : si `ai.tri > 1`, c'est déjà en %, ne pas multiplier par 100.

**BUG 10 — DSCR calculé sur current_year, pas sur year2**
`PlanOvoViewer.tsx` L170 : `dscr = ebitdaSeries[currentIdx] / annualDebtService`. Le DSCR devrait utiliser l'EBITDA projeté de la première année de remboursement (year2), pas l'EBITDA actuel qui peut être négatif pour une startup.
- **Fix** : Utiliser `ebitdaSeries[3]` (year2) pour le calcul du DSCR.

---

### Plan de correction — 3 fichiers

#### 1. `supabase/functions/_shared/normalizers.ts`
- **normalizePlanOvo** : Après recalcul de gross_profit, forcer `ebitda = gross_profit - total_opex`
- **enforceFrameworkConstraints** : 
  - Ajouter validation `if (net_profit[yk] > ebitda[yk]) → net_profit = ebitda * (1 - IS/100)`
  - CAGR : retourner `null` si valeur de départ ≤ 0
  - funding_need : dériver des CAPEX si = 0
  - Croissance historique : taux distinct par série
  - Garde-fou ROI vs VAN

#### 2. `supabase/functions/generate-plan-ovo/index.ts`
- Corriger l'exponent CAGR dans le prompt : `1/6` → `1/5`

#### 3. `src/components/dashboard/PlanOvoViewer.tsx`
- Afficher "N/A" si CAGR sur valeur de départ ≤ 0
- Afficher "N/A" si totalInvestment ≤ 0 pour ROI/TRI/Payback
- Garde-fou TRI : si `ai.tri > 1`, ne pas multiplier par 100
- DSCR : utiliser `ebitdaSeries[3]` au lieu de `[2]`

