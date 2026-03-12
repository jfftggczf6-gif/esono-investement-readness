

## Afficher le bouton "Régénération complète" dès qu'il y a des livrables

### Changement

**Fichier** : `src/components/dashboard/EntrepreneurDashboard.tsx` — ligne 1404

Remplacer :
```tsx
{pipelineState === 'up_to_date' && !generating && (
```

Par :
```tsx
{pipelineState && !generating && (
```

Cela affiche le bouton dès que `pipelineState` est défini (`'generate'`, `'update'` ou `'up_to_date'`), c'est-à-dire dès qu'une entreprise existe. L'utilisateur pourra toujours forcer un recalcul complet peu importe l'état actuel des livrables.

