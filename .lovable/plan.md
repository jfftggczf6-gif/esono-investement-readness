

## Problème

Trois modules génèrent des projections financières indépendamment via l'IA, ce qui crée des incohérences :
- **Framework** (Plan Financier Intermédiaire) : projections 5 ans dans `projection_5ans.lignes`
- **Plan OVO** (Plan Financier Final) : projections 8 ans dans `revenue`, `ebitda`, etc.
- **Business Plan** : tableau financier 3 ans dans `financier_tableau`

Chaque module appelle l'IA séparément. Même si le prompt dit "respecte les valeurs", l'IA peut arrondir ou diverger.

## Solution proposée : synchronisation déterministe post-IA

### Principe
Le **Framework** est la source de vérité pour les projections. Après chaque appel IA, on **écrase programmatiquement** les valeurs de projection avec celles du Framework. Pas de calcul déterministe des prix unitaires — l'IA reste responsable de la granularité (produits, services, OPEX détaillé, staff). On force uniquement la cohérence des **agrégats financiers** (CA, Marge Brute, EBITDA, Résultat Net, Cash-Flow).

### Pour les prix unitaires et détails granulaires
L'IA génère les détails (produits, prix unitaires, OPEX par catégorie, effectifs). Ensuite, un **ajustement proportionnel déterministe** recale les totaux : si l'IA génère un CA de 500M mais le Framework dit 450M, on applique un ratio de 0.9 à tous les produits/services pour que la somme tombe juste. Même logique pour les charges.

### Modifications concrètes

**1. `supabase/functions/generate-plan-ovo/index.ts`** — Ajouter `enforceFrameworkConstraints(data, frameworkData)` après `normalizePlanOvo()` :
- Lire `framework.projection_5ans.lignes` (CA Total, Marge Brute, EBITDA, Résultat Net, Cash-Flow Net)
- Pour year2 à year6 (an1→an5 du Framework), écraser `data.revenue`, `data.gross_profit`, `data.ebitda`, `data.net_profit`, `data.cashflow`
- Recalculer `cogs = revenue - gross_profit`
- Recalculer les marges en %
- Ajuster proportionnellement les sous-catégories OPEX pour que leur somme corresponde à `gross_profit - ebitda`
- Recalculer `investment_metrics` (VAN, TRI) de manière déterministe à partir des cashflows synchronisés

**2. `supabase/functions/generate-business-plan/index.ts`** — Ajouter un post-traitement sur `financier_tableau` :
- Lire le `plan_ovo` déjà synchronisé (disponible dans `ctx.deliverableMap["plan_ovo"]`)
- Écraser `annee1/annee2/annee3` du tableau financier avec les valeurs year2/year3/year4 du Plan OVO
- Garantit que le Business Plan affiche exactement les mêmes chiffres

**3. `supabase/functions/_shared/normalizers.ts`** — Extraire la fonction `enforceFrameworkConstraints` dans les helpers partagés pour réutilisation

### Ce qui ne change PAS
- Le Framework reste généré par l'IA sans contrainte (c'est la source)
- Les années historiques (N-2, N-1, N) du Plan OVO restent issues de l'IA/inputs
- Les détails qualitatifs (produits, staff, hypothèses, scénarios narratifs) restent libres
- La structure des previews HTML ne change pas

### Résumé du flux

```text
Framework (source)          Plan OVO (synchronisé)       Business Plan (synchronisé)
────────────────           ──────────────────────       ─────────────────────────────
projection_5ans.lignes ──► revenue/ebitda/etc year2-6   financier_tableau annee1-3
  CA Total an1-an5    ──►   revenue year2-year6     ──►   revenu annee1-3
  Marge Brute an1-5   ──►   gross_profit year2-6    ──►   marge_brute annee1-3
  EBITDA an1-5        ──►   ebitda year2-6          ──►   (calcul)
  Résultat Net an1-5  ──►   net_profit year2-6      ──►   benefice_net annee1-3
  Cash-Flow an1-5     ──►   cashflow year2-6        ──►   tresorerie_finale annee1-3
                            ↓
                      Recalcul déterministe:
                      - cogs = revenue - gross_profit
                      - opex ajusté proportionnellement
                      - marges en % recalculées
                      - VAN/TRI recalculés sur cashflows
```

