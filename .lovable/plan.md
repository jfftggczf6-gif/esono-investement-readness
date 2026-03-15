

## Pourquoi la page Livrables n'affiche pas les nouveaux modules

La page `Livrables.tsx` a une liste statique `DELIVERABLES` qui ne contient que 7 types anciens. Les 3 nouveaux livrables générés (`gap_analysis`, `investment_memo`, `onepager`) ne sont pas dans cette liste, donc ils sont invisibles.

### Base de données — ce qui existe
- `gap_analysis` — score 42 ✅
- `investment_memo` — score 73 ✅  
- `onepager` — score 78 ✅
- `pitch_deck` — pas encore généré ❌

### Correction

**Fichier : `src/pages/Livrables.tsx`**

Ajouter les 4 nouveaux types dans le tableau `DELIVERABLES` :

```typescript
{ type: 'gap_analysis', label: 'Analyse des Écarts', module: 'Gap Analysis', icon: Search, format: '.html' },
{ type: 'investment_memo', label: "Mémo d'Investissement", module: 'Mémo Investisseur', icon: Briefcase, format: '.html' },
{ type: 'onepager', label: 'One-Pager Investisseur', module: 'One-Pager', icon: FileText, format: '.html' },
{ type: 'pitch_deck', label: 'Pitch Deck', module: 'Pitch Deck', icon: Presentation, format: '.html' },
```

Ajouter les imports d'icônes manquants (`Search`, `Briefcase`, `Presentation`).

Résultat : les 3 livrables déjà générés apparaîtront immédiatement avec leur score, et le pitch deck sera en "En attente".

