

## Diagnostic : pourquoi Gap Analysis, Mémo Investisseur et Pitch Deck n'ont pas été générés

### Cause identifiée
Les logs montrent **zéro appel** aux fonctions `generate-gap-analysis`, `generate-investment-memo` et `generate-pitch-deck`. Ces fonctions existent dans le code mais n'ont probablement jamais été déployées sur l'environnement Edge. Les fonctions plus anciennes (BMC, SIC, etc.) fonctionnent car elles étaient déjà déployées.

Le pipeline client (`pipeline-runner.ts`) continue après une erreur non-crédit, donc le problème n'est pas que le pipeline s'arrête — c'est que l'appel HTTP retourne une erreur 500 immédiate (fonction non trouvée ou crash au boot) et le pipeline enregistre l'erreur silencieusement.

### Plan de correction

**1. Déployer les 3 fonctions manquantes**
Déclencher le déploiement de `generate-gap-analysis`, `generate-investment-memo`, `generate-pitch-deck` via l'outil de déploiement Edge Functions.

**2. Ajouter un bouton "Tester ces modules" dans le dashboard**
Ajouter dans `EntrepreneurDashboard.tsx` un bouton dédié qui lance uniquement les 4 modules manquants (gap_analysis, investment_memo, onepager, pitch_deck) séquentiellement, avec feedback visuel :
- Bouton visible quand les modules précédents (BMC, SIC, etc.) sont déjà générés
- Exécution séquentielle des 4 edge functions
- Toast de succès/erreur par module
- Refresh des données après chaque appel réussi

**3. Fichiers modifiés**
- `src/components/dashboard/EntrepreneurDashboard.tsx` : ajout du bouton "Générer modules avancés" avec handler dédié

