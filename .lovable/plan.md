

## Plan : Separer Memo et One-Pager en deux volets distincts

### Contexte actuel
- L'edge function `generate-investment-memo` genere les deux documents (memo + onepager) dans un seul deliverable de type `investment_memo`.
- `InvestmentMemoViewer` les affiche deja dans deux onglets (Tabs), donc la separation visuelle existe mais au sein d'un meme module.

### Approche proposee
Creer deux modules visuels distincts dans la barre de navigation du bas, tout en gardant la generation unifiee (une seule edge function qui produit les deux).

### Modifications

**1. `src/lib/dashboard-config.ts`**
- Ajouter un module `onepager` dans `MODULE_CONFIG` (step 10) avec une icone dediee (ex: `FileText` ou `Layout`)
- Ajouter dans `MODULE_CONFIG_COACH` egalement
- Ajouter dans `delivTypeMap` : `onepager → onepager`

**2. `src/components/dashboard/EntrepreneurDashboard.tsx`**
- Dans le `delivTypeMap`, ajouter `onepager: 'onepager'`
- Quand le module `investment_memo` est genere et que le data contient `onepager`, sauvegarder aussi un deliverable separe de type `onepager` (ou extraire a l'affichage)
- Pour le viewer : quand `selectedModule === 'investment_memo'`, afficher uniquement le memo ; quand `selectedModule === 'onepager'`, afficher uniquement le one-pager
- Creer un `OnePagerViewer` simple ou reutiliser `InvestmentMemoViewer` en mode filtre

**3. `src/components/dashboard/InvestmentMemoViewer.tsx`**
- Retirer les onglets Tabs et n'afficher que le memo
- Creer un nouveau composant `OnePagerViewer.tsx` qui n'affiche que le one-pager

**4. Edge function `generate-investment-memo`**
- Apres generation, sauvegarder **deux** deliverables : un de type `investment_memo` (memo seul) et un de type `onepager` (one-pager seul)
- Ou bien : garder le deliverable unique et extraire cote frontend (plus simple, moins de migration)

### Option recommandee (la plus simple)
Garder un seul deliverable `investment_memo` contenant les deux, mais afficher deux icones dans la barre du bas qui pointent vers le meme deliverable avec un filtre d'affichage different. Pas de migration SQL necessaire, pas de changement d'edge function.

### Fichiers modifies
- `src/lib/dashboard-config.ts`
- `src/components/dashboard/EntrepreneurDashboard.tsx`
- `src/components/dashboard/InvestmentMemoViewer.tsx` (memo seulement)
- Nouveau : `src/components/dashboard/OnePagerViewer.tsx`

