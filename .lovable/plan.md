

## Corrections des incohérences financières (RDC Congo et universel)

### Problème 1 : Résultat Net = EBITDA (taxe IS non appliquée)

Le guard actuel utilise `>` (strict) aux lignes 567, 783 et 796 de `normalizers.ts`. Si l'IA retourne `net_profit === ebitda`, la condition est fausse → pas de déduction de l'IS. C'est exactement ce qui se passe.

**Correction** : Remplacer `>` par `>=` aux 3 endroits. Quand `net_profit >= ebitda`, forcer `net_profit = EBITDA × (1 - IS%)`.

### Problème 2 : TRI (IRR) incohérent

Le solveur Newton-Raphson (lignes 823-838) diverge quand l'investissement initial est très petit par rapport aux cashflows (ratio élevé → TRI réel très élevé, le solveur ne converge pas). Le retry (ligne 902) ne s'active que si `tri <= 0`, mais dans ce cas le TRI est positif mais absurdement bas (ex: 1.4% alors que VAN et ROI sont très élevés).

**Correction** : Ajouter un **fallback par bisection** quand le TRI semble incohérent (TRI < 10% mais VAN/ROI très positifs). La bisection est robuste et converge toujours, même pour des TRI > 100%.

### Fichier modifié

`supabase/functions/_shared/normalizers.ts` — 3 changements :

1. **Ligne 567** : `d.net_profit[yk] > d.ebitda[yk]` → `>=`
2. **Ligne 783** : idem `>=`  
3. **Ligne 796** : idem `>=`
4. **Lignes 823-838** : Remplacer le Newton-Raphson par une fonction hybride (Newton + fallback bisection) qui détecte aussi le cas "TRI trop bas vs VAN élevée"
5. **Lignes 901-918** : Étendre le guard existant pour couvrir le cas `tri > 0 mais incohérent`

### Impact

- Universel : s'applique à toutes les entreprises (RDC, Côte d'Ivoire, etc.)
- Le taux IS est déjà dynamique par pays via `getFiscalParams()`
- Pas de changement de schéma DB

